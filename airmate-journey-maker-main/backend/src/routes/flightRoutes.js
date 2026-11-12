import { Router } from "express";
import {
  getFlights,
  getFlight,
  getFlightSeatsHandler,
  updateFlightSeatsHandler,
  createFlightHandler,
  updateFlightHandler,
  deleteFlightHandler,
  getFlightStatusHandler,
  getRecommendationsHandler,
} from "../controllers/flightController.js";
import { authenticateToken, requireAdmin } from "../middleware/authMiddleware.js";

const router = Router();

// Public flight viewing - specific routes first to avoid conflicts
router.get("/status", getFlightStatusHandler);
router.get("/recommendations", getRecommendationsHandler);
router.get("/", getFlights);
router.get("/:id", getFlight);
router.get("/:id/seats", getFlightSeatsHandler);

// Admin-only flight management
router.post("/", authenticateToken, requireAdmin, createFlightHandler);
router.put("/:id", authenticateToken, requireAdmin, updateFlightHandler);
router.patch("/:id", authenticateToken, requireAdmin, updateFlightHandler);
router.delete("/:id", authenticateToken, requireAdmin, deleteFlightHandler);
router.patch("/:id/seats/:seatNumber", authenticateToken, requireAdmin, updateFlightSeatsHandler);

export default router;
