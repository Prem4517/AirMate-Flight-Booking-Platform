import { logger } from "../utils/logger.js";
import { Notification } from "../models/Notification.js";
import { isDBConnected } from "../config/db.js";

// In-memory notifications fallback
export const inMemoryNotifications = [];

let transporter = null;
let isConfigured = false;
let nodemailerModule = null;

/**
 * Initialize email transporter based on configuration
 */
async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    try {
      if (!nodemailerModule) {
        nodemailerModule = await import("nodemailer").catch(() => null);
      }
      if (nodemailerModule && nodemailerModule.default) {
        transporter = nodemailerModule.default.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        isConfigured = true;
        logger.info(`[EmailService] Configured with SMTP server (${host}:${port})`);
      } else {
        logger.info("[EmailService] SMTP configured but nodemailer driver not installed. Using simulated provider.");
      }
    } catch (err) {
      logger.warn(`[EmailService] SMTP init failed, using simulated provider: ${err.message}`);
      transporter = null;
    }
  } else {
    logger.info("[EmailService] Configured to use simulated email provider (no SMTP credentials in env).");
  }

  return transporter;
}

/**
 * Record notification in database or memory
 */
export async function recordNotification({
  userId,
  userEmail,
  type,
  title,
  message,
  bookingRef,
  metadata = {},
}) {
  try {
    if (isDBConnected()) {
      await Notification.create({
        userId,
        userEmail,
        type,
        title,
        message,
        bookingRef,
        read: false,
        metadata,
      });
    } else {
      inMemoryNotifications.unshift({
        id: "notif_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        userId,
        userEmail,
        type,
        title,
        message,
        bookingRef,
        read: false,
        metadata,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.warn(`[EmailService] Could not store notification: ${err.message}`);
  }
}

/**
 * Generic send mail handler that never leaks credentials
 */
async function sendMail({ to, subject, html, text, notificationMeta }) {
  const from = process.env.EMAIL_FROM || "AirMate Travel <no-reply@airmate.com>";
  const client = await getTransporter();

  // If live transporter configured, send actual mail
  if (client) {
    try {
      const info = await client.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
      logger.info(`[EmailService] Live email dispatched to ${to} (MessageID: ${info.messageId})`);
    } catch (err) {
      logger.warn(`[EmailService] Live email dispatch failed for ${to}: ${err.message}. Recording local copy.`);
    }
  } else {
    // Simulated delivery for local dev / demo
    logger.info(`[EmailService - Simulated Provider] To: ${to} | Subject: "${subject}"`);
  }

  // Also push to in-app notification center so customer immediately sees it
  if (notificationMeta) {
    await recordNotification({
      userId: notificationMeta.userId,
      userEmail: to,
      type: notificationMeta.type,
      title: notificationMeta.title || subject,
      message: notificationMeta.message || text,
      bookingRef: notificationMeta.bookingRef,
      metadata: notificationMeta.metadata,
    });
  }

  return { success: true, recipient: to, subject };
}

/**
 * 1. Booking Confirmation Email
 */
export async function sendBookingConfirmationEmail(booking, user) {
  const recipient = booking.contact?.email || user?.email;
  if (!recipient) return;

  const ref = booking.bookingRef;
  const flight = booking.flight || {};
  const total = booking.fareBreakdown?.total || 0;
  const passengers = (booking.passengers || []).map((p) => `${p.firstName} ${p.lastName}`).join(", ");

  const subject = `Booking Confirmed: PNR ${ref} — ${flight.fromCode} to ${flight.toCode}`;
  const text = `Dear Customer,

Your AirMate flight has been confirmed!
PNR: ${ref}
Route: ${flight.from || flight.fromCode} (${flight.fromCode}) → ${flight.to || flight.toCode} (${flight.toCode})
Flight: ${flight.airline} ${flight.flightNumber}
Date: ${booking.travelDate}
Passengers: ${passengers || "1 Adult"}
Seat: ${booking.seat || "Assigned at gate"}
Total Fare: ₹${total.toLocaleString("en-IN")}

You can view your e-ticket and boarding pass anytime under My Trips in your AirMate travel dashboard.

Safe travels,
AirMate Flight Operations Team`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; color: #ffffff; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">AirMate</h1>
        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Booking Confirmation & E-Ticket</p>
      </div>
      <div style="padding: 24px;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 6px 0; color: #166534; font-size: 16px;">Flight Confirmed · PNR: <strong>${ref}</strong></h2>
          <p style="margin: 0; font-size: 13px; color: #15803d;">Your reservation is secured and payment is confirmed.</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Flight:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0f172a;">${flight.airline} (${flight.flightNumber})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Route:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0f172a;">${flight.fromCode} &rarr; ${flight.toCode}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Travel Date:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0f172a;">${booking.travelDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Schedule:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0f172a;">${flight.departure} &ndash; ${flight.arrival}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Seat:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0f172a;">${booking.seat || "Assigned at gate"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Passengers:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0f172a;">${passengers}</td>
          </tr>
          <tr style="border-top: 1px solid #e2e8f0;">
            <td style="padding: 12px 0 0 0; color: #0f172a; font-weight: 700;">Total Paid:</td>
            <td style="padding: 12px 0 0 0; font-weight: 700; text-align: right; color: #0284c7; font-size: 16px;">₹${total.toLocaleString("en-IN")}</td>
          </tr>
        </table>

        <div style="text-align: center; margin-top: 24px;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">Access your full booking and download your boarding pass anytime in your customer dashboard.</p>
        </div>
      </div>
    </div>
  `;

  return sendMail({
    to: recipient,
    subject,
    text,
    html,
    notificationMeta: {
      userId: booking.userId || user?.id,
      type: "booking_confirmed",
      title: `Booking Confirmed: PNR ${ref}`,
      message: `Your flight ${flight.airline} ${flight.flightNumber} (${flight.fromCode} → ${flight.toCode}) on ${booking.travelDate} is confirmed. Seat: ${booking.seat || "Standard"}.`,
      bookingRef: ref,
      metadata: { flightNumber: flight.flightNumber, total },
    },
  });
}

/**
 * 2. Cancellation and Refund Request Email
 */
export async function sendCancellationRefundEmail(booking, { refundAmount, reason }) {
  const recipient = booking.contact?.email;
  if (!recipient) return;

  const ref = booking.bookingRef;
  const flight = booking.flight || {};

  const subject = `Cancellation & Refund Initiated: PNR ${ref}`;
  const text = `Dear Customer,

Your cancellation request for booking PNR ${ref} has been received and processed.

Flight: ${flight.airline} ${flight.flightNumber} (${flight.fromCode} → ${flight.toCode})
Date: ${booking.travelDate}
Reason: ${reason || "Customer requested"}
Refund Amount: ₹${Number(refundAmount || 0).toLocaleString("en-IN")}
Status: Refund Processed to Original Payment Method (Estimated 3-5 business days).

You can track your refund timeline in your AirMate My Trips portal.

Regards,
AirMate Customer Care`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #dc2626; padding: 20px; color: #ffffff; text-align: center;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Booking Cancelled</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">PNR: ${ref}</p>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 14px; color: #334155;">Your booking for <strong>${flight.fromCode} &rarr; ${flight.toCode}</strong> has been cancelled as requested.</p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
            <span style="color: #64748b;">Refund Amount:</span>
            <strong style="color: #16a34a; font-size: 15px;">₹${Number(refundAmount || 0).toLocaleString("en-IN")}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span style="color: #64748b;">Refund Status:</span>
            <span style="color: #0284c7; font-weight: 600;">Processed (3-5 business days)</span>
          </div>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Transaction reference generated. Refund will credit back to your original source of payment.</p>
      </div>
    </div>
  `;

  return sendMail({
    to: recipient,
    subject,
    text,
    html,
    notificationMeta: {
      userId: booking.userId,
      type: "booking_cancelled",
      title: `Booking Cancelled: PNR ${ref}`,
      message: `Your booking for ${flight.airline} ${flight.flightNumber} has been cancelled. Refund of ₹${Number(refundAmount || 0).toLocaleString("en-IN")} processed.`,
      bookingRef: ref,
      metadata: { refundAmount },
    },
  });
}

/**
 * 3. Flight Status Alert Email
 */
export async function sendFlightStatusUpdateEmail(booking, { status, delayWindow, gate, terminal }) {
  const recipient = booking.contact?.email;
  if (!recipient) return;

  const ref = booking.bookingRef;
  const flight = booking.flight || {};

  const subject = `Flight Status Alert: ${flight.flightNumber} (${status})`;
  const text = `Flight Status Alert for PNR ${ref}:
Flight: ${flight.airline} ${flight.flightNumber}
Current Status: ${status}
Terminal: ${terminal || flight.terminal || "T1"} | Gate: ${gate || flight.gate || "A1"}
Expected Departure: ${flight.departure} ${delayWindow ? `(${delayWindow})` : ""}

Check your live travel dashboard on AirMate for real-time gate and delay updates.`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #f59e0b; padding: 20px; color: #ffffff; text-align: center;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Flight Status Alert</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">${flight.airline} ${flight.flightNumber} · PNR ${ref}</p>
      </div>
      <div style="padding: 24px;">
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>Status: ${status}</strong> ${delayWindow ? `&mdash; Delay window: ${delayWindow}` : ""}
          </p>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #b45309;">
            Terminal: ${terminal || flight.terminal || "T1"} &bull; Gate: ${gate || flight.gate || "A1"}
          </p>
        </div>
      </div>
    </div>
  `;

  return sendMail({
    to: recipient,
    subject,
    text,
    html,
    notificationMeta: {
      userId: booking.userId,
      type: "flight_status",
      title: `Flight Update: ${flight.flightNumber} is ${status}`,
      message: `${flight.airline} ${flight.flightNumber} (${flight.fromCode} → ${flight.toCode}) on ${booking.travelDate} status is ${status}. Terminal: ${terminal || flight.terminal || "T1"}, Gate: ${gate || flight.gate || "A1"}.`,
      bookingRef: ref,
      metadata: { status, gate, terminal },
    },
  });
}
