import { Router } from "express";
import {
  getProfileHandler,
  updateProfileHandler,
  changePasswordHandler,
  getPassengersHandler,
  addPassengerHandler,
  updatePassengerHandler,
  deletePassengerHandler,
  getSavedFlightsHandler,
  saveFlightHandler,
  removeSavedFlightHandler,
  togglePriceAlertHandler,
  getNotificationsHandler,
  markNotificationReadHandler,
  markAllNotificationsReadHandler,
  getSupportTicketsHandler,
  createSupportTicketHandler,
  replySupportTicketHandler,
} from "../controllers/userController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = Router();

// All customer user routes require valid authentication
router.use(authenticateToken);

// Profile
router.get("/profile", getProfileHandler);
router.put("/profile", updateProfileHandler);
router.post("/change-password", changePasswordHandler);

// Saved Passengers (Travellers)
router.get("/passengers", getPassengersHandler);
router.post("/passengers", addPassengerHandler);
router.put("/passengers/:id", updatePassengerHandler);
router.delete("/passengers/:id", deletePassengerHandler);

// Saved Flights & Price Alerts
router.get("/saved-flights", getSavedFlightsHandler);
router.post("/saved-flights", saveFlightHandler);
router.delete("/saved-flights/:flightId", removeSavedFlightHandler);
router.put("/saved-flights/:flightId/alert", togglePriceAlertHandler);

// Notifications Center
router.get("/notifications", getNotificationsHandler);
router.put("/notifications/:id/read", markNotificationReadHandler);
router.put("/notifications/read-all", markAllNotificationsReadHandler);

// Customer Support Tickets
router.get("/support", getSupportTicketsHandler);
router.post("/support", createSupportTicketHandler);
router.post("/support/:ticketId/reply", replySupportTicketHandler);

export default router;
