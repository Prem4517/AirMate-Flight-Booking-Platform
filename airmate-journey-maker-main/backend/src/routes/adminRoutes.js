import { Router } from "express";
import { authenticateToken, requireAdmin } from "../middleware/authMiddleware.js";
import {
  getOverview,
  getAnalytics,
  getAdminFlights,
  createAdminFlight,
  updateAdminFlight,
  rescheduleAdminFlight,
  updateFlightStatusAdmin,
  cancelAdminFlight,
  deleteAdminFlight,
  getAdminBookings,
  getAdminBookingDetail,
  updateAdminBookingStatus,
  refundAdminBooking,
  getAdminUsers,
  updateAdminUserStatus,
  updateAdminUserRole,
  getAdminAuditLogs,
  exportCsvHandler,
  getAdminSupportTickets,
  getAdminSupportTicketDetail,
  adminReplyToTicket,
  adminUpdateTicketStatus,
} from "../controllers/adminController.js";

const router = Router();

// Strictly protect all administrative APIs with both authentication & admin role check
router.use(authenticateToken, requireAdmin);

/**
 * 1. Overview & Analytics
 */
router.get("/overview", getOverview);
router.get("/dashboard", getOverview);
router.get("/analytics", getAnalytics);
router.get("/reports", getAnalytics);

/**
 * 2. Flight Operations Management
 */
router.get("/flights", getAdminFlights);
router.post("/flights", createAdminFlight);
router.put("/flights/:id", updateAdminFlight);
router.patch("/flights/:id/reschedule", rescheduleAdminFlight);
router.patch("/flights/:id/status", updateFlightStatusAdmin);
router.patch("/flights/:id/cancel", cancelAdminFlight);
router.delete("/flights/:id", deleteAdminFlight);

/**
 * 3. Booking Management
 */
router.get("/bookings", getAdminBookings);
router.get("/bookings/:bookingRef", getAdminBookingDetail);
router.patch("/bookings/:bookingRef/status", updateAdminBookingStatus);
router.post("/bookings/:bookingRef/refund", refundAdminBooking);

/**
 * 4. User Directory & Access Management
 */
router.get("/users", getAdminUsers);
router.patch("/users/:id/status", updateAdminUserStatus);
router.patch("/users/:id/role", updateAdminUserRole);

/**
 * 5. Audit Trails & Operational Security Logs
 */
router.get("/audit-logs", getAdminAuditLogs);

/**
 * 6. CSV Data Export
 */
router.get("/export/:type", exportCsvHandler);

/**
 * 7. Support Ticket Management
 */
router.get("/support", getAdminSupportTickets);
router.get("/support/:ticketId", getAdminSupportTicketDetail);
router.post("/support/:ticketId/reply", adminReplyToTicket);
router.patch("/support/:ticketId/status", adminUpdateTicketStatus);

export default router;
