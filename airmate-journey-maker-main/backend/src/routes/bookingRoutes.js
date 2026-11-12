import { Router } from "express";
import {
  createBookingHandler,
  getBookingsHandler,
  getMyBookingsHandler,
  getBookingByIdHandler,
  getUserBookingsHandler,
  createPaymentIntentHandler,
  confirmPaymentHandler,
  cancelBookingHandler,
  getBookingTimelineHandler,
  getBookingRefundStatusHandler,
  getBookingPassengersHandler,
  addBookingPassengerHandler,
} from "../controllers/bookingController.js";
import {
  authenticateToken,
  requireCustomer,
  requireAdmin,
} from "../middleware/authMiddleware.js";

const router = Router();

// Creating a booking and starting payment requires a customer account.
router.post("/", authenticateToken, requireCustomer, createBookingHandler);

// Customer's personal bookings
router.get("/my", authenticateToken, getMyBookingsHandler);

// Admin only: view all bookings across platform
router.get("/", authenticateToken, requireAdmin, getBookingsHandler);

// View user bookings by user ID (strictly restricted to the user or admin)
router.get("/user/:userId", authenticateToken, getUserBookingsHandler);

// Create Stripe PaymentIntent for a customer booking.
router.post("/:bookingRef/payment-intent", authenticateToken, requireCustomer, createPaymentIntentHandler);

// Confirm payment after successful Stripe payment.
router.post("/:bookingRef/confirm-payment", authenticateToken, requireCustomer, confirmPaymentHandler);

// Customer booking cancellation request (supports both POST and PATCH as requested by API spec)
router.post("/:bookingRef/cancel", authenticateToken, cancelBookingHandler);
router.patch("/:bookingRef/cancel", authenticateToken, cancelBookingHandler);

// Booking passengers
router.get("/:bookingRef/passengers", authenticateToken, getBookingPassengersHandler);
router.post("/:bookingRef/passengers", authenticateToken, addBookingPassengerHandler);

// Operational booking timeline
router.get("/:bookingRef/timeline", authenticateToken, getBookingTimelineHandler);

// Refund tracking
router.get("/:bookingRef/refund-status", authenticateToken, getBookingRefundStatusHandler);

// View specific booking by booking ref or ID (verifies ownership).
router.get("/:id", authenticateToken, getBookingByIdHandler);

export default router;
