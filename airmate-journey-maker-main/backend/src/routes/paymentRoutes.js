import { Router } from "express";
import { Payment } from "../models/Payment.js";
import { Booking } from "../models/Booking.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  createPaymentIntentService,
  confirmPaymentService,
} from "../services/bookingService.js";
import { logger } from "../utils/logger.js";

const router = Router();

/**
 * POST /api/payments/create or /api/v1/payments/create
 * Create a payment transaction for a booking
 */
router.post("/create", authenticateToken, async (req, res, next) => {
  try {
    const { bookingRef } = req.body;
    if (!bookingRef) {
      return res.status(400).json({ error: "BadRequest", message: "bookingRef is required" });
    }

    const booking = await Booking.findOne({ bookingRef });
    if (!booking) {
      return res.status(404).json({ error: "NotFound", message: "Booking not found" });
    }
    if (!canAccessBooking(req.user, booking)) {
      return res.status(403).json({ error: "Forbidden", message: "Access denied" });
    }

    const intent = await createPaymentIntentService({
      bookingRef,
      amount: booking.fareBreakdown.total,
    });

    res.json(intent);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/webhook or /api/v1/payments/webhook
 * Payment provider webhook handler
 */
router.post("/webhook", async (req, res) => {
  try {
    const event = req.body;
    logger.info(`Payment webhook received: ${event.type || "generic"}`);

    if (event.type === "payment_intent.succeeded" && event.data?.object) {
      const pi = event.data.object;
      const bookingRef = pi.metadata?.bookingRef;
      if (bookingRef) {
        await confirmPaymentService({
          bookingRef,
          paymentIntentId: pi.id,
          paymentMethod: "stripe",
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error(`Webhook error: ${error.message}`);
    res.status(400).json({ error: "WebhookError", message: error.message });
  }
});

/**
 * GET /api/payments/:id or /api/v1/payments/:id
 * Retrieve a payment record
 */
router.get("/:id", authenticateToken, async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      $or: [{ paymentId: req.params.id }, { bookingRef: req.params.id.toUpperCase() }, { transactionId: req.params.id }],
    }).lean();

    if (!payment) {
      return res.status(404).json({ error: "NotFound", message: "Payment record not found" });
    }

    const booking = await Booking.findOne({ bookingRef: payment.bookingRef });
    if (!booking || !canAccessBooking(req.user, booking)) {
      return res.status(403).json({ error: "Forbidden", message: "Access denied" });
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
});

export default router;

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
