import { Seat } from "../models/Seat.js";
import { Flight } from "../models/Flight.js";
import { isDBConnected } from "../config/db.js";
import { logger } from "../utils/logger.js";

const COLS = ["A", "B", "C", "D", "E", "F"];

/**
 * Initialize seat map for a flight in MongoDB if not already generated
 */
export async function initializeFlightSeats(flightId, rows = 12) {
  if (!isDBConnected()) return [];

  const existingCount = await Seat.countDocuments({ flightId });
  if (existingCount > 0) {
    return await Seat.find({ flightId }).sort({ row: 1, column: 1 }).lean();
  }

  // Pre-seed realistic seat map
  const seatsToInsert = [];
  for (let r = 1; r <= rows; r++) {
    for (const c of COLS) {
      const seatNumber = `${r}${c}`;
      let type = "middle";
      if (c === "A" || c === "F") type = "window";
      if (c === "C" || c === "D") type = "aisle";

      let cabinClass = "Economy";
      let price = 350; // standard seat selection fee

      if (r <= 2) {
        cabinClass = "Business";
        price = 1200;
      } else if (r <= 4) {
        cabinClass = "Premium Economy";
        price = 700;
        if (r === 3) type = "extra-legroom";
      }

      seatsToInsert.push({
        flightId,
        seatNumber,
        row: r,
        column: c,
        cabinClass,
        type,
        price,
        isAvailable: true,
        isBooked: false,
      });
    }
  }

  try {
    const created = await Seat.insertMany(seatsToInsert);
    logger.info(`Initialized ${created.length} seats for flight ${flightId} in MongoDB`);
    return created.map((s) => s.toObject());
  } catch (err) {
    logger.warn(`Could not initialize seats for flight ${flightId}: ${err.message}`);
    return await Seat.find({ flightId }).sort({ row: 1, column: 1 }).lean();
  }
}

/**
 * Get seat map for a flight
 */
export async function getFlightSeatsService(flightId) {
  if (isDBConnected()) {
    let seats = await Seat.find({ flightId }).sort({ row: 1, column: 1 }).lean();
    if (seats.length === 0) {
      seats = await initializeFlightSeats(flightId);
    }
    return seats;
  }

  // Resilient in-memory fallback
  const seats = [];
  for (let r = 1; r <= 12; r++) {
    for (const c of COLS) {
      const seatNumber = `${r}${c}`;
      seats.push({
        flightId,
        seatNumber,
        row: r,
        column: c,
        cabinClass: r <= 2 ? "Business" : "Economy",
        type: c === "A" || c === "F" ? "window" : c === "C" || c === "D" ? "aisle" : "middle",
        price: 350,
        isAvailable: true,
        isBooked: false,
      });
    }
  }
  return seats;
}

/**
 * Atomically reserve a seat to strictly prevent double booking
 */
export async function reserveSeatAtomic({ flightId, seatNumber, bookingRef, userId }) {
  if (!seatNumber) return null;
  const cleanSeat = seatNumber.trim().toUpperCase();

  if (isDBConnected()) {
    // Ensure seats exist first
    await initializeFlightSeats(flightId);

    // Atomic findOneAndUpdate with condition isBooked: false
    const reserved = await Seat.findOneAndUpdate(
      { flightId, seatNumber: cleanSeat, isBooked: false },
      {
        $set: {
          isBooked: true,
          isAvailable: false,
          bookingRef: bookingRef?.toUpperCase(),
          userId,
        },
      },
      { new: true }
    );

    if (!reserved) {
      // Check if seat exists and is already booked
      const exists = await Seat.findOne({ flightId, seatNumber: cleanSeat });
      if (exists && exists.isBooked) {
        const error = new Error(`Seat ${cleanSeat} is already booked on flight ${flightId}. Please choose another seat.`);
        error.code = "DOUBLE_BOOKING";
        error.status = 409;
        throw error;
      }
    }

    return reserved?.toObject() || null;
  }

  return { flightId, seatNumber: cleanSeat, isBooked: true, bookingRef };
}

/**
 * Atomically release a seat upon cancellation
 */
export async function releaseSeatAtomic({ flightId, seatNumber, bookingRef }) {
  if (!seatNumber) return;
  const cleanSeat = seatNumber.trim().toUpperCase();

  if (isDBConnected()) {
    const filter = { flightId, seatNumber: cleanSeat };
    if (bookingRef) filter.bookingRef = bookingRef.toUpperCase();

    await Seat.findOneAndUpdate(filter, {
      $set: {
        isBooked: false,
        isAvailable: true,
        bookingRef: null,
        userId: null,
      },
    });
  }
}

/**
 * Admin seat management: update seat status/price
 */
export async function adminUpdateSeatService(flightId, seatNumber, { isAvailable, price, cabinClass }) {
  if (isDBConnected()) {
    const clean = seatNumber.trim().toUpperCase();
    const update = {};
    if (typeof isAvailable === "boolean") {
      update.isAvailable = isAvailable;
      if (!isAvailable) update.isBooked = true;
    }
    if (price !== undefined) update.price = Number(price);
    if (cabinClass) update.cabinClass = cabinClass;

    const seat = await Seat.findOneAndUpdate(
      { flightId, seatNumber: clean },
      { $set: update },
      { new: true }
    );
    return seat?.toObject();
  }
  return null;
}
