import { logger } from "../utils/logger.js";
import { Booking } from "../models/Booking.js";
import {
  createBookingService,
  confirmPaymentService,
  createPaymentIntentService,
  getAllBookingsService,
  getUserBookingsService,
  getBookingByIdService,
  getBookingByRefService,
  customerCancelBookingService,
  getBookingTimelineService,
  getBookingRefundStatusService,
} from "../services/bookingService.js";

function canAccessBooking(user, booking) {
  if (!user || !booking) return false;
  if (user.role === "admin") return true;

  const ownerId = booking.userId ? String(booking.userId) : null;
  const userId = user.id ? String(user.id) : null;
  const ownerEmail = booking.contact?.email?.trim().toLowerCase();
  const userEmail = user.email?.trim().toLowerCase();

  return Boolean(
    (ownerId && userId && ownerId === userId) ||
    (ownerEmail && userEmail && ownerEmail === userEmail)
  );
}

function denyBookingAccess(res) {
  return res.status(403).json({
    error: "Forbidden",
    message: "Access denied: You are not authorized to access this booking",
  });
}

/**
 * POST /api/bookings
 * Create a new booking with server-side fare validation.
 * Accepts: flightId, cabinClass, travelDate, passengers[], seat, baggage, contact, idempotencyKey
 */
export async function createBookingHandler(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    const userEmail = req.user ? req.user.email : null;
    const userName = req.user ? req.user.name : null;

    const {
      bookingId,
      flightId,
      flight,
      cabinClass,
      travelDate,
      passengers,
      seat,
      seats,
      baggage,
      contact,
      idempotencyKey,
    } = req.body;

    const booking = await createBookingService({
      bookingId,
      userId,
      userEmail,
      userName,
      flightId,
      flight,
      cabinClass,
      travelDate,
      passengers,
      seat,
      seats,
      baggage,
      contact,
      idempotencyKey,
    });

    res.status(201).json(booking);
  } catch (error) {
    logger.error(`Failed to create booking: ${error.message}`);
    if (
      error.code === "DOUBLE_BOOKING" ||
      error.status === 409 ||
      error.message.includes("already booked")
    ) {
      return res.status(409).json({ error: "Conflict", message: error.message });
    }
    if (
      error.message.includes("required") ||
      error.message.includes("cannot be in the past") ||
      error.message.includes("not found") ||
      error.message.includes("Maximum") ||
      error.message.includes("first name") ||
      error.message.includes("last name")
    ) {
      return res.status(400).json({ error: "BadRequest", message: error.message });
    }
    next(error);
  }
}

/**
 * POST /api/bookings/:bookingRef/payment-intent
 * Create a Stripe PaymentIntent for the booking.
 */
export async function createPaymentIntentHandler(req, res, next) {
  try {
    const { bookingRef } = req.params;
    const booking = await getBookingByIdService(bookingRef);

    if (!booking) {
      return res.status(404).json({ error: "NotFound", message: "Booking not found" });
    }

    if (!canAccessBooking(req.user, booking)) return denyBookingAccess(res);

    if (booking.paymentStatus === "paid") {
      return res.status(409).json({ error: "Conflict", message: "Booking is already paid" });
    }

    const intent = await createPaymentIntentService({
      bookingRef,
      amount: booking.fareBreakdown.total,
    });

    res.json(intent);
  } catch (error) {
    logger.error(`Payment intent failed: ${error.message}`);
    next(error);
  }
}

/**
 * POST /api/bookings/:bookingRef/confirm-payment
 * Mark booking as paid after successful payment.
 */
export async function confirmPaymentHandler(req, res, next) {
  try {
    const { bookingRef } = req.params;
    const { paymentIntentId, paymentMethod } = req.body;

    const booking = await getBookingByIdService(bookingRef);
    if (!booking) {
      return res.status(404).json({ error: "NotFound", message: "Booking not found" });
    }

    if (!canAccessBooking(req.user, booking)) return denyBookingAccess(res);

    const confirmed = await confirmPaymentService({ bookingRef, paymentIntentId, paymentMethod });
    res.json(confirmed);
  } catch (error) {
    logger.error(`Payment confirmation failed: ${error.message}`);
    if (error.message.includes("not found") || error.message.includes("already processed")) {
      return res.status(409).json({ error: "Conflict", message: error.message });
    }
    next(error);
  }
}

/**
 * GET /api/bookings
 * Admin only: get all bookings.
 */
export async function getBookingsHandler(req, res, next) {
  try {
    const bookings = await getAllBookingsService();
    res.json(bookings);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/bookings/my
 * Authenticated customer: get own bookings.
 */
export async function getMyBookingsHandler(req, res, next) {
  try {
    const bookings = await getUserBookingsService(req.user.id, req.user.email);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/bookings/:id
 * Get a booking by ID or booking reference with ownership verification.
 */
export async function getBookingByIdHandler(req, res, next) {
  try {
    const { id } = req.params;
    const booking = await getBookingByIdService(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!canAccessBooking(req.user, booking)) return denyBookingAccess(res);

    res.json(booking);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/bookings/user/:userId
 * Get bookings by user ID. Restricted to owner or admin.
 */
export async function getUserBookingsHandler(req, res, next) {
  try {
    const { userId } = req.params;

    if (req.user.role !== "admin" && req.user.id !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Access denied: You can only access your own bookings",
      });
    }

    const user = req.user.role === "admin" ? { id: userId, email: "" } : req.user;
    const bookings = await getUserBookingsService(userId, user.email);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/bookings/:bookingRef/cancel
 * Customer booking cancellation request
 */
export async function cancelBookingHandler(req, res, next) {
  try {
    const { bookingRef } = req.params;
    const { reason } = req.body;
    const userId = req.user ? req.user.id : null;
    const userEmail = req.user ? req.user.email : null;

    const result = await customerCancelBookingService({
      bookingRef,
      userId,
      userEmail,
      reason,
    });

    res.json(result);
  } catch (error) {
    logger.error(`Cancellation error for ${req.params.bookingRef}: ${error.message}`);
    if (error.message.includes("Unauthorized") || error.message.includes("Access denied")) {
      return res.status(403).json({ error: "Forbidden", message: error.message });
    }
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: "NotFound", message: error.message });
    }
    if (error.message.includes("already cancelled")) {
      return res.status(400).json({ error: "BadRequest", message: error.message });
    }
    next(error);
  }
}

/**
 * GET /api/bookings/:bookingRef/timeline
 * Operational booking journey timeline
 */
export async function getBookingTimelineHandler(req, res, next) {
  try {
    const { bookingRef } = req.params;
    const userId = req.user ? req.user.id : null;
    const userEmail = req.user ? req.user.email : null;

    const timeline = await getBookingTimelineService(bookingRef, userId, userEmail);
    res.json(timeline);
  } catch (error) {
    if (error.message.includes("Access denied")) {
      return res.status(403).json({ error: "Forbidden", message: error.message });
    }
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: "NotFound", message: error.message });
    }
    next(error);
  }
}

/**
 * GET /api/bookings/:bookingRef/refund-status
 * Refund status and transaction reference tracking
 */
export async function getBookingRefundStatusHandler(req, res, next) {
  try {
    const { bookingRef } = req.params;
    const userId = req.user ? req.user.id : null;
    const userEmail = req.user ? req.user.email : null;

    const refund = await getBookingRefundStatusService(bookingRef, userId, userEmail);
    res.json(refund);
  } catch (error) {
    if (error.message.includes("Access denied")) {
      return res.status(403).json({ error: "Forbidden", message: error.message });
    }
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: "NotFound", message: error.message });
    }
    next(error);
  }
}

/**
 * GET /api/bookings/:bookingRef/passengers or /api/v1/bookings/:bookingRef/passengers
 */
export async function getBookingPassengersHandler(req, res, next) {
  try {
    const { bookingRef } = req.params;
    const booking = await getBookingByRefService(bookingRef);
    if (!booking) {
      return res.status(404).json({ error: "NotFound", message: "Booking not found" });
    }
    if (!canAccessBooking(req.user, booking)) return denyBookingAccess(res);
    res.json({
      bookingRef,
      passengers: booking.passengers || [],
      count: booking.passengerCount || booking.passengers?.length || 0,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/bookings/:bookingRef/passengers or /api/v1/bookings/:bookingRef/passengers
 */
export async function addBookingPassengerHandler(req, res, next) {
  try {
    const { bookingRef } = req.params;
    const passengerData = req.body;
    const booking = await getBookingByRefService(bookingRef);
    if (!booking) {
      return res.status(404).json({ error: "NotFound", message: "Booking not found" });
    }
    if (!canAccessBooking(req.user, booking)) return denyBookingAccess(res);
    // Update booking in MongoDB
    booking.passengers = booking.passengers || [];
    booking.passengers.push(passengerData);
    booking.passengerCount = booking.passengers.length;
    await Booking.findOneAndUpdate({ bookingRef }, { passengers: booking.passengers, passengerCount: booking.passengerCount });
    res.status(201).json(passengerData);
  } catch (error) {
    next(error);
  }
}
