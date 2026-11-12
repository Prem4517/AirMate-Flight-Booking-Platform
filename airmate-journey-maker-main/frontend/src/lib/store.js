import { useSyncExternalStore } from "react";
import {
  createBooking as apiCreateBooking,
  createPaymentIntent as apiCreatePaymentIntent,
  confirmPayment as apiConfirmPayment,
  getStoredUser,
  getStoredToken,
  setStoredUser,
  setStoredToken,
  clearStoredAuth,
  fetchCurrentUser,
  fetchMyBookings,
  fetchAllBookingsAdmin,
} from "../services/api";

const DRAFT_KEY = "airmate_booking_draft";

function loadDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistDraft(draft) {
  if (typeof window === "undefined") return;
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore quota / private mode
  }
}

const initialUser = getStoredUser();

const state = {
  user: initialUser,
  token: getStoredToken(),
  authLoading: !!getStoredToken(),
  /**
   * draft: {
   *   flight,          — full flight object (with selected cabin class & price)
   *   cabinClass,      — selected cabin class string
   *   travelDate,      — YYYY-MM-DD
   *   passengers,      — number of passengers (from search)
   *   passengerDetails,— Array of { firstName, lastName, dateOfBirth, gender, nationality, type }
   *   seat,            — selected seat string e.g. "5A"
   *   seats,           — array of seat strings for multi-pax
   *   baggage,         — { checkinKg, cabinKg, cost }
   * }
   */
  draft: loadDraft(),
  bookings: [],
  version: 0,
};

const listeners = new Set();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let snapshot = { ...state };

function commit() {
  persistDraft(state.draft);
  state.version = (state.version || 0) + 1;
  snapshot = { ...state };
  emit();
}

function getSnapshot() {
  return state.version;
}

/**
 * Initialize user authentication status against the backend
 */
async function initializeAuth() {
  const token = getStoredToken();
  if (token) {
    try {
      const user = await fetchCurrentUser();
      if (user) {
        state.user = user;
        state.token = token;
      } else {
        state.user = null;
        state.token = null;
      }
    } catch (e) {
      console.warn("Auth initialization error:", e);
      state.user = null;
      state.token = null;
    }
  } else {
    state.user = null;
    state.token = null;
  }
  state.authLoading = false;
  commit();

  // Load appropriate bookings based on role
  loadRoleBookings();
}

/**
 * Load bookings according to role
 */
async function loadRoleBookings() {
  if (!state.user) {
    state.bookings = [];
    commit();
    return;
  }

  try {
    if (state.user.role === "admin") {
      const allBookings = await fetchAllBookingsAdmin();
      if (Array.isArray(allBookings)) {
        state.bookings = allBookings;
        commit();
      }
    } else {
      const myBookings = await fetchMyBookings();
      if (Array.isArray(myBookings)) {
        state.bookings = myBookings;
        commit();
      }
    }
  } catch (err) {
    console.warn("Could not load bookings:", err);
  }
}

// Kick off auth initialization
initializeAuth();

export function useStore() {
  useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );
  return snapshot;
}

export const store = {
  get() {
    return snapshot;
  },

  setUser(user, token) {
    state.user = user;
    if (token) {
      state.token = token;
      setStoredToken(token);
    }
    setStoredUser(user);
    state.authLoading = false;
    commit();
    loadRoleBookings();
  },

  logout() {
    clearStoredAuth();
    state.user = null;
    state.token = null;
    state.bookings = [];
    commit();
  },

  /**
   * Start a booking from flight selection.
   * @param {Object} flight  - The flight object with selected cabin class & price
   * @param {number} passengerCount - Total number of passengers
   * @param {string} travelDate - YYYY-MM-DD
   */
  startBooking(flight, passengerCount = 1, travelDate = null) {
    const date = travelDate || new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10);
    state.draft = {
      flight,
      cabinClass: flight.cabinClass || "Economy",
      travelDate: date,
      passengers: passengerCount,
      passengerDetails: [],
      seat: null,
      seats: [],
      baggage: null,
    };
    commit();
  },

  /**
   * Save passenger details from the PassengerDetails form.
   */
  setPassengerDetails(details) {
    if (!state.draft) return;
    state.draft = { ...state.draft, passengerDetails: details };
    commit();
  },

  setSeat(seat) {
    if (!state.draft) return;
    state.draft = { ...state.draft, seat };
    commit();
  },

  setBaggage(baggage) {
    if (!state.draft) return;
    state.draft = { ...state.draft, baggage };
    commit();
  },

  /**
   * Confirm booking — calls backend to create booking record,
   * then creates a PaymentIntent, then confirms payment.
   *
   * Returns the confirmed booking object.
   */
  async confirmBooking({ cardDetails } = {}) {
    if (!state.draft) throw new Error("No booking in progress");

    const { draft } = state;
    const user = state.user;

    // Build passenger list — use stored details or generate defaults
    let passengers = draft.passengerDetails;
    if (!passengers || passengers.length === 0) {
      // Fallback: generate anonymous passengers
      passengers = Array.from({ length: draft.passengers }, (_, i) => ({
        type: "adult",
        firstName: i === 0 ? (user ? user.name.split(" ")[0] : "Passenger") : `Passenger`,
        lastName: i === 0 ? (user ? (user.name.split(" ")[1] || "One") : "One") : String(i + 1),
        gender: "male",
        nationality: "Indian",
      }));
    }

    const contact = {
      email: user ? user.email : (draft.passengerDetails[0] && draft.passengerDetails[0].email) || "",
      phone: (() => {
        const raw = (draft.passengerDetails[0] && draft.passengerDetails[0].phone) || "";
        if (!raw) return "";
        return raw.startsWith("+") ? raw : `+91 ${raw}`;
      })(),
      name: passengers[0].firstName + " " + passengers[0].lastName,
    };

    // 1. Create booking on backend (server computes fare)
    const created = await apiCreateBooking({
      flightId: draft.flight.id || draft.flight._id,
      cabinClass: draft.cabinClass,
      travelDate: draft.travelDate,
      passengers,
      seat: draft.seat,
      seats: draft.seats,
      baggage: draft.baggage
        ? { checkinKg: draft.baggage.checkin || draft.baggage.checkinKg, cabinKg: draft.baggage.cabin || draft.baggage.cabinKg }
        : null,
      contact,
      idempotencyKey: `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    });

    if (!created || !created.bookingRef) {
      throw new Error("Booking creation failed — no reference returned");
    }

    // 2. Create PaymentIntent
    const intent = await apiCreatePaymentIntent(created.bookingRef);

    // 3. Confirm payment (demo mode: no real card charge)
    const confirmed = await apiConfirmPayment(created.bookingRef, {
      paymentIntentId: intent.paymentIntentId || intent.id,
      paymentMethod: "card",
    });

    // 4. Update local state
    state.bookings = [confirmed, ...state.bookings];
    state.draft = null;
    commit();

    // Refresh from server
    loadRoleBookings();

    return confirmed;
  },

  refreshBookings: loadRoleBookings,
  revalidateAuth: initializeAuth,
};

export { getSnapshot };
