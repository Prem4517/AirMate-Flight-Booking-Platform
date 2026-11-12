// AirMate API client with separate Customer and Admin authentication and role protection
import { flights as localFlights } from "@/data/flights.js";
import {
  cleanTicketId,
  getSharedTickets,
  saveSharedTickets,
  mergeTicketLists,
  upsertSharedTicket,
  appendMessageToSharedTicket,
  updateSharedTicketStatus,
} from "@/lib/supportSync.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const TOKEN_KEY = "airmate_auth_token";
const USER_KEY = "airmate_auth_user";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function authHeaders(extraHeaders = {}) {
  const token = getStoredToken();
  const headers = { ...extraHeaders };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Public Customer Registration
 */
export async function registerCustomer(credentials) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Registration failed");
  }

  setStoredToken(data.token);
  setStoredUser(data.user);
  return data;
}

/**
 * Customer Login
 */
export async function loginCustomer(credentials) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Login failed");
  }

  setStoredToken(data.token);
  setStoredUser(data.user);
  return data;
}

/**
 * Dedicated Administrator Login
 */
export async function loginAdmin(credentials) {
  const res = await fetch(`${API_BASE_URL}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Administrator authentication failed");
  }

  setStoredToken(data.token);
  setStoredUser(data.user);
  return data;
}

/**
 * Fetch authenticated user profile & verify session
 */
export async function fetchCurrentUser() {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: authHeaders(),
    });

    if (res.status === 401 || res.status === 403) {
      clearStoredAuth();
      return null;
    }

    if (!res.ok) return null;
    const data = await res.json();
    setStoredUser(data.user);
    return data.user;
  } catch (error) {
    console.warn("Could not verify session with server:", error);
    return getStoredUser();
  }
}

/**
 * Logout
 */
export async function logoutUser() {
  try {
    const token = getStoredToken();
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: authHeaders(),
      });
    }
  } catch (e) {
    // ignore
  } finally {
    clearStoredAuth();
  }
}

function getLocalFilteredFlights(params = {}) {
  let list = [...localFlights];
  const from = (params.from || "").trim().toLowerCase();
  const to = (params.to || "").trim().toLowerCase();

  if (from) {
    list = list.filter(
      (f) =>
        f.from?.toLowerCase().includes(from) ||
        f.fromCode?.toLowerCase() === from ||
        f.fromAirport?.toLowerCase().includes(from)
    );
  }
  if (to) {
    list = list.filter(
      (f) =>
        f.to?.toLowerCase().includes(to) ||
        f.toCode?.toLowerCase() === to ||
        f.toAirport?.toLowerCase().includes(to)
    );
  }
  if (params.airline && params.airline !== "All") {
    list = list.filter((f) => f.airline === params.airline);
  }
  if (params.maxPrice) {
    list = list.filter((f) => f.price <= Number(params.maxPrice));
  }
  if (params.maxDuration) {
    list = list.filter((f) => (f.durationMins || 120) <= Number(params.maxDuration));
  }
  if (params.stops !== undefined && params.stops !== "all") {
    const stopsNum = Number(params.stops);
    list = list.filter((f) => f.stops === stopsNum);
  }

  if (params.sortBy === "cheapest" || params.sortBy === "price") {
    list.sort((a, b) => a.price - b.price);
  } else if (params.sortBy === "fastest" || params.sortBy === "duration") {
    list.sort((a, b) => (a.durationMins || 0) - (b.durationMins || 0));
  }

  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 6;
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginated = list.slice((page - 1) * limit, page * limit);

  return {
    flights: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    },
    meta: {
      isSimulated: true,
      notice: "Demo Flight Schedule: Displaying realistic simulated schedule data.",
    },
  };
}

/**
 * Fetch flights with discovery filters, sorting, and pagination
 */
export async function fetchFlights(params = {}) {
  const cleanParams = {};
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      cleanParams[key] = val;
    }
  }

  const query = new URLSearchParams(cleanParams).toString();
  try {
    const res = await fetch(`${API_BASE_URL}/flights${query ? `?${query}` : ""}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend offline or unreachable, falling back to simulated flight data:", err);
  }

  // Graceful fallback to local flights
  return getLocalFilteredFlights(params);
}

export async function fetchFlightById(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/flights/${id}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend offline or unreachable, checking local flight data:", err);
  }
  const match = localFlights.find((f) => f.id === id || f._id === id);
  if (match) return match;
  throw new Error("Flight details could not be retrieved");
}

export async function fetchFlightStatus(flightNumber, date) {
  const params = new URLSearchParams();
  if (flightNumber) params.append("flightNumber", flightNumber);
  if (date) params.append("date", date);
  
  try {
    const res = await fetch(`${API_BASE_URL}/flights/status?${params.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend offline or unreachable, checking local flight status:", err);
  }

  const cleanNum = (flightNumber || "").trim().toUpperCase();
  const match = localFlights.find(
    (f) => f.flightNumber?.toUpperCase() === cleanNum || f.id?.toUpperCase() === cleanNum
  );
  if (match) {
    return {
      flightNumber: match.flightNumber,
      airline: match.airline,
      from: match.from,
      to: match.to,
      departure: match.departure,
      arrival: match.arrival,
      status: match.status || "On Time",
      terminal: match.terminal || "T1",
      gate: match.gate || "Gate 3",
      delayRisk: "Low",
    };
  }
  throw new Error(`Flight ${flightNumber || ""} status not found`);
}

export async function fetchFlightRecommendations(params = {}) {
  const cleanParams = {};
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      cleanParams[key] = val;
    }
  }
  
  const query = new URLSearchParams(cleanParams).toString();
  try {
    const res = await fetch(`${API_BASE_URL}/flights/recommendations${query ? `?${query}` : ""}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend offline or unreachable, using local flight recommendations:", err);
  }

  const list = [...localFlights];
  const sortBy = params.sortBy || "value";
  if (sortBy === "price") list.sort((a, b) => a.price - b.price);
  else if (sortBy === "duration") list.sort((a, b) => (a.durationMins || 0) - (b.durationMins || 0));
  return {
    recommendations: list.slice(0, Number(params.limit) || 12),
    count: list.length,
    criteria: { sortBy },
  };
}

/**
 * Booking APIs
 */
export async function createBooking(bookingData) {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(bookingData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create booking");
    }
    return await res.json();
  } catch (error) {
    console.error("API error creating booking:", error);
    throw error;
  }
}

/**
 * Create a Stripe PaymentIntent for a booking
 */
export async function createPaymentIntent(bookingRef) {
  const res = await fetch(`${API_BASE_URL}/bookings/${bookingRef}/payment-intent`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create payment intent");
  }
  return await res.json();
}

/**
 * Confirm payment for a booking
 */
export async function confirmPayment(bookingRef, { paymentIntentId, paymentMethod } = {}) {
  const res = await fetch(`${API_BASE_URL}/bookings/${bookingRef}/confirm-payment`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ paymentIntentId, paymentMethod: paymentMethod || "card" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to confirm payment");
  }
  return await res.json();
}

/**
 * Fetch booking by booking reference
 */
export async function fetchBookingByRef(bookingRef) {
  const res = await fetch(`${API_BASE_URL}/bookings/${bookingRef}`, {
    headers: authHeaders(),
  });
  if (res.status === 403) {
    throw new Error("Access denied: You do not have permission to view this booking.");
  }
  if (!res.ok) return null;
  return await res.json();
}

/**
 * Fetch customer's personal bookings
 */
export async function fetchMyBookings() {
  const res = await fetch(`${API_BASE_URL}/bookings/my`, {
    headers: authHeaders(),
  });
  if (res.status === 401) {
    clearStoredAuth();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch bookings");
  }
  return await res.json();
}

export async function fetchBookingById(id) {
  const res = await fetch(`${API_BASE_URL}/bookings/${id}`, {
    headers: authHeaders(),
  });
  if (res.status === 403) {
    throw new Error("Access denied: You do not have permission to view this booking.");
  }
  if (!res.ok) {
    return null;
  }
  return await res.json();
}

/**
 * Admin Operations Portal APIs
 */
export async function fetchAdminOverview() {
  const res = await fetch(`${API_BASE_URL}/admin/overview`, {
    headers: authHeaders(),
  });
  if (res.status === 401) {
    clearStoredAuth();
    throw new Error("Authentication required. Please sign in as an administrator.");
  }
  if (res.status === 403) {
    throw new Error("Access denied: Administrator privileges required.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load admin overview");
  }
  return await res.json();
}

export async function fetchAdminAnalytics() {
  const res = await fetch(`${API_BASE_URL}/admin/analytics`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load analytics");
  }
  return await res.json();
}

/**
 * Admin Flights APIs
 */
export async function fetchAdminFlights(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "all") q.append(k, v);
  });
  const res = await fetch(`${API_BASE_URL}/admin/flights?${q.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch flights");
  }
  return await res.json();
}

export async function createFlightAdmin(flightData) {
  const res = await fetch(`${API_BASE_URL}/admin/flights`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(flightData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create flight");
  }
  return await res.json();
}

export async function updateFlightAdmin(id, flightData) {
  const res = await fetch(`${API_BASE_URL}/admin/flights/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(flightData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update flight");
  }
  return await res.json();
}

export async function rescheduleFlightAdmin(id, data) {
  const res = await fetch(`${API_BASE_URL}/admin/flights/${id}/reschedule`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to reschedule flight");
  }
  return await res.json();
}

export async function updateFlightStatusAdmin(id, data) {
  const res = await fetch(`${API_BASE_URL}/admin/flights/${id}/status`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update flight status");
  }
  return await res.json();
}

export async function cancelFlightAdmin(id, data = {}) {
  const res = await fetch(`${API_BASE_URL}/admin/flights/${id}/cancel`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to cancel flight");
  }
  return await res.json();
}

export async function deleteFlightAdmin(id) {
  const res = await fetch(`${API_BASE_URL}/admin/flights/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to delete flight");
  }
  return await res.json();
}

/**
 * Admin Bookings APIs
 */
export async function fetchAdminBookings(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "all") q.append(k, v);
  });
  const res = await fetch(`${API_BASE_URL}/admin/bookings?${q.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch bookings");
  }
  return await res.json();
}

export async function fetchAdminBookingDetail(bookingRef) {
  const res = await fetch(`${API_BASE_URL}/admin/bookings/${bookingRef}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch booking details");
  }
  return await res.json();
}

export async function updateBookingStatusAdmin(bookingRef, data) {
  const res = await fetch(`${API_BASE_URL}/admin/bookings/${bookingRef}/status`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update booking status");
  }
  return await res.json();
}

export async function refundBookingAdmin(bookingRef, data = {}) {
  const res = await fetch(`${API_BASE_URL}/admin/bookings/${bookingRef}/refund`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to process refund");
  }
  return await res.json();
}

/**
 * Admin Users APIs
 */
export async function fetchAdminUsers(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "all") q.append(k, v);
  });
  const res = await fetch(`${API_BASE_URL}/admin/users?${q.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch users");
  }
  return await res.json();
}

export async function updateUserStatusAdmin(id, accountStatus) {
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}/status`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ accountStatus }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update user status");
  }
  return await res.json();
}

export async function updateUserRoleAdmin(id, role) {
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}/role`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update user role");
  }
  return await res.json();
}

/**
 * Admin Audit Logs APIs
 */
export async function fetchAdminAuditLogs(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "all") q.append(k, v);
  });
  const res = await fetch(`${API_BASE_URL}/admin/audit-logs?${q.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch audit logs");
  }
  return await res.json();
}

/**
 * Trigger CSV export download in browser
 */
export async function downloadAdminCsv(type) {
  const res = await fetch(`${API_BASE_URL}/admin/export/${type}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to export ${type} data`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `airmate_${type}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function fetchAllBookingsAdmin() {
  const res = await fetch(`${API_BASE_URL}/admin/bookings`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch all bookings");
  }
  return await res.json();
}

/**
 * ==========================================
 * Customer Travel Dashboard APIs
 * ==========================================
 */

// Profile & Security
export async function fetchUserProfile() {
  const res = await fetch(`${API_BASE_URL}/user/profile`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load profile");
  }
  return await res.json();
}

export async function updateUserProfile(updateData) {
  const res = await fetch(`${API_BASE_URL}/user/profile`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(updateData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update profile");
  }
  return await res.json();
}

export async function changeUserPassword(data) {
  const res = await fetch(`${API_BASE_URL}/user/change-password`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to change password");
  }
  return await res.json();
}

// Saved Passengers (Travellers)
export async function fetchSavedPassengers() {
  const res = await fetch(`${API_BASE_URL}/user/passengers`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load saved passengers");
  }
  return await res.json();
}

export async function addSavedPassenger(passengerData) {
  const res = await fetch(`${API_BASE_URL}/user/passengers`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(passengerData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to add passenger");
  }
  return await res.json();
}

export async function updateSavedPassenger(id, passengerData) {
  const res = await fetch(`${API_BASE_URL}/user/passengers/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(passengerData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update passenger");
  }
  return await res.json();
}

export async function deleteSavedPassenger(id) {
  const res = await fetch(`${API_BASE_URL}/user/passengers/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to remove passenger");
  }
  return await res.json();
}

// Saved Flights & Price Alerts
export async function fetchSavedFlights() {
  const res = await fetch(`${API_BASE_URL}/user/saved-flights`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load saved flights");
  }
  return await res.json();
}

export async function saveFlightToFavourites(flightData) {
  const res = await fetch(`${API_BASE_URL}/user/saved-flights`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(flightData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to save flight");
  }
  return await res.json();
}

export async function removeSavedFlight(flightId) {
  const res = await fetch(`${API_BASE_URL}/user/saved-flights/${flightId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to remove saved flight");
  }
  return await res.json();
}

export async function togglePriceAlert(flightId, data) {
  const res = await fetch(`${API_BASE_URL}/user/saved-flights/${flightId}/alert`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update price alert");
  }
  return await res.json();
}

// Notifications Center
export async function fetchUserNotifications() {
  const res = await fetch(`${API_BASE_URL}/user/notifications`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load notifications");
  }
  return await res.json();
}

export async function markNotificationAsRead(id) {
  const res = await fetch(`${API_BASE_URL}/user/notifications/${id}/read`, {
    method: "PUT",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to mark notification as read");
  }
  return await res.json();
}

export async function markAllNotificationsAsRead() {
  const res = await fetch(`${API_BASE_URL}/user/notifications/read-all`, {
    method: "PUT",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to mark all as read");
  }
  return await res.json();
}

// Support Tickets (Synchronized with shared localStorage store & real-time events)
export async function fetchSupportTickets() {
  let serverTickets = [];
  try {
    const res = await fetch(`${API_BASE_URL}/user/support`, {
      headers: authHeaders(),
    });
    if (res.ok) {
      serverTickets = await res.json();
    }
  } catch (err) {
    console.warn("Server support fetch failed, falling back to shared store:", err);
  }

  const localTickets = getSharedTickets();
  const merged = mergeTicketLists(serverTickets, localTickets);
  saveSharedTickets(merged);
  return merged;
}

export async function createSupportTicket(data) {
  const cleanRef = data.bookingRef ? String(data.bookingRef).toUpperCase().trim() : "";
  let created = null;

  try {
    const res = await fetch(`${API_BASE_URL}/user/support`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data),
    });
    if (res.ok) {
      created = await res.json();
    }
  } catch (err) {
    console.warn("Server ticket creation failed, persisting to shared store:", err);
  }

  if (!created) {
    const ticketId = "TKT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    created = {
      ticketId,
      subject: data.subject || "Customer Support",
      category: data.category || "general",
      bookingRef: cleanRef,
      priority: data.priority || "medium",
      status: "open",
      messages: [
        {
          sender: "customer",
          senderName: "Traveler",
          message: data.message,
          timestamp: new Date().toISOString(),
        },
        {
          sender: "support",
          senderName: "AirMate Automated Assistant",
          message: `Thank you for reaching out! Ticket #${ticketId} has been logged. Our operations team is reviewing your inquiry.`,
          timestamp: new Date(Date.now() + 1000).toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return upsertSharedTicket(created);
}

export async function replySupportTicket(ticketId, message) {
  const cleanId = cleanTicketId(ticketId);

  // Optimistically append traveler's message to shared store so admin sees it immediately
  appendMessageToSharedTicket(cleanId, {
    sender: "customer",
    senderName: "Traveler",
    message: message.trim(),
    timestamp: new Date().toISOString(),
  });

  let updated = null;
  try {
    const res = await fetch(`${API_BASE_URL}/user/support/${cleanId}/reply`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message }),
    });
    if (res.ok) {
      updated = await res.json();
    }
  } catch (err) {
    console.warn("Server reply failed, using shared store:", err);
  }

  if (updated) {
    return upsertSharedTicket(updated);
  }
  return getSharedTickets().find((t) => cleanTicketId(t.ticketId) === cleanId);
}

// Booking Lifecycle & Actions
export async function cancelCustomerBooking(bookingRef, reason) {
  const res = await fetch(`${API_BASE_URL}/bookings/${bookingRef}/cancel`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Cancellation failed");
  }
  return await res.json();
}

export async function fetchBookingTimeline(bookingRef) {
  const res = await fetch(`${API_BASE_URL}/bookings/${bookingRef}/timeline`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load timeline");
  }
  return await res.json();
}

export async function fetchBookingRefundStatus(bookingRef) {
  const res = await fetch(`${API_BASE_URL}/bookings/${bookingRef}/refund-status`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load refund status");
  }
  return await res.json();
}

// Promo Codes
export async function fetchPromoCodes() {
  const res = await fetch(`${API_BASE_URL}/promos`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch promo codes");
  }
  return await res.json();
}

export async function validatePromoCodeApi(code, baseFare, cabinClass) {
  const res = await fetch(`${API_BASE_URL}/promos/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, baseFare, cabinClass }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Invalid promo code");
  }
  return await res.json();
}

export async function calculateBaggageApi(data) {
  try {
    const res = await fetch(`${API_BASE_URL}/promos/baggage-calculator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend offline or unreachable, using local baggage calculation:", err);
  }

  // Local fallback calculation
  const airline = data.airline || "AirMate Express";
  const cabinClass = data.cabinClass || "Economy";
  const checkinKg = Number(data.checkinKg) || 15;
  const cabinKg = Number(data.cabinKg) || 7;
  const hasSports = Boolean(data.hasSportsEquipment);
  const hasMusic = Boolean(data.hasMusicalInstrument);

  let freeCheckin = 15;
  let freeCabin = 7;
  let excessRate = 500;
  if (cabinClass === "Premium Economy") { freeCheckin = 20; freeCabin = 10; }
  else if (cabinClass === "Business") { freeCheckin = 30; freeCabin = 12; }
  else if (cabinClass === "First") { freeCheckin = 40; freeCabin = 15; }

  const excessCheckinKg = Math.max(0, checkinKg - freeCheckin);
  const excessCabinKg = Math.max(0, cabinKg - freeCabin);
  const checkinFee = excessCheckinKg * excessRate;
  const cabinFee = excessCabinKg * Math.round(excessRate * 1.5);
  const specialFee = (hasSports ? 1200 : 0) + (hasMusic ? 1500 : 0);
  const totalExcessFee = checkinFee + cabinFee + specialFee;

  return {
    airline,
    cabinClass,
    allowance: {
      checkinKg: freeCheckin,
      cabinKg: freeCabin,
      excessCheckinRate: excessRate,
      excessCabinRate: Math.round(excessRate * 1.5),
    },
    requested: { checkinKg, cabinKg },
    breakdown: {
      excessCheckinKg,
      excessCheckinFee: checkinFee,
      excessCabinKg,
      excessCabinFee: cabinFee,
      specialEquipmentFee: specialFee,
      totalExcessFee,
    },
    notes: [
      `Standard check-in allowance for ${cabinClass}: ${freeCheckin} kg`,
      `Cabin baggage allowance: ${freeCabin} kg (1 piece + laptop bag)`,
    ],
  };
}

// Assistant Query
export async function sendAssistantMessage(query) {
  const res = await fetch(`${API_BASE_URL}/assistant/chat`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to query assistant");
  }
  return await res.json();
}

/**
 * Fetch seat map and live inventory for a flight from MongoDB
 */
export async function fetchFlightSeats(flightId) {
  const res = await fetch(`${API_BASE_URL}/flights/${flightId}/seats`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch seat inventory");
  }
  return await res.json();
}

/**
 * Admin: Update seat availability or price
 */
export async function updateSeatAdmin(flightId, seatNumber, data) {
  const res = await fetch(`${API_BASE_URL}/flights/${flightId}/seats/${seatNumber}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update seat");
  }
  return await res.json();
}



// Admin Support Ticket Management (Synchronized with shared localStorage store & real-time events)
export async function fetchAdminSupportTickets(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  const cleanSearch = params.search ? cleanTicketId(params.search) : "";
  if (cleanSearch) query.set("search", cleanSearch);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.page) query.set("page", String(params.page));

  let serverTickets = [];
  try {
    const qStr = query.toString();
    const url = `${API_BASE_URL}/admin/support${qStr ? `?${qStr}` : ""}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      serverTickets = Array.isArray(data) ? data : data.tickets || [];
    }
  } catch (err) {
    console.warn("Server admin tickets fetch failed, falling back to shared store:", err);
  }

  const localTickets = getSharedTickets();
  const merged = mergeTicketLists(serverTickets, localTickets);
  saveSharedTickets(merged);

  let filtered = [...merged];
  if (params.status) {
    filtered = filtered.filter((t) => t.status === params.status);
  }
  if (params.search) {
    const q = params.search.replace(/^#/, "").toLowerCase().trim();
    filtered = filtered.filter(
      (t) =>
        cleanTicketId(t.ticketId).toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q) ||
        t.bookingRef?.toLowerCase().includes(q) ||
        t.userEmail?.toLowerCase().includes(q) ||
        t.userName?.toLowerCase().includes(q)
    );
  }

  return {
    tickets: filtered,
    total: filtered.length,
    page: Number(params.page || 1),
    limit: Number(params.limit || 50),
  };
}

export async function fetchAdminSupportTicketDetail(ticketId) {
  const cleanId = cleanTicketId(ticketId);
  try {
    const res = await fetch(`${API_BASE_URL}/admin/support/${cleanId}`, {
      headers: authHeaders(),
    });
    if (res.ok) {
      const serverTicket = await res.json();
      return upsertSharedTicket(serverTicket);
    }
  } catch (err) {
    console.warn("Server ticket detail fetch failed:", err);
  }

  const local = getSharedTickets().find((t) => cleanTicketId(t.ticketId) === cleanId);
  if (local) return local;
  throw new Error("Ticket not found");
}

export async function adminReplyToSupportTicket(ticketId, message) {
  const cleanId = cleanTicketId(ticketId);

  // Optimistically append admin reply to shared store
  appendMessageToSharedTicket(cleanId, {
    sender: "support",
    senderName: "Operations Administrator",
    message: message.trim(),
    timestamp: new Date().toISOString(),
  });

  let updated = null;
  try {
    const res = await fetch(`${API_BASE_URL}/admin/support/${cleanId}/reply`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message }),
    });
    if (res.ok) {
      updated = await res.json();
    }
  } catch (err) {
    console.warn("Admin server reply failed, using shared store:", err);
  }

  if (updated) {
    return upsertSharedTicket(updated);
  }
  return getSharedTickets().find((t) => cleanTicketId(t.ticketId) === cleanId);
}

export async function adminUpdateSupportTicketStatus(ticketId, status) {
  const cleanId = cleanTicketId(ticketId);
  updateSharedTicketStatus(cleanId, status);

  let updated = null;
  try {
    const res = await fetch(`${API_BASE_URL}/admin/support/${cleanId}/status`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      updated = await res.json();
    }
  } catch (err) {
    console.warn("Admin status update failed:", err);
  }

  if (updated) {
    return upsertSharedTicket(updated);
  }
  return getSharedTickets().find((t) => cleanTicketId(t.ticketId) === cleanId);
}
