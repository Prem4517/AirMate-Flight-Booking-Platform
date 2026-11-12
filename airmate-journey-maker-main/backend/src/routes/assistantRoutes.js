import { Router } from "express";
import { optionalAuth } from "../middleware/authMiddleware.js";
import { answerAssistantQuery } from "../services/assistantService.js";
import { logger } from "../utils/logger.js";

const router = Router();

/**
 * POST /api/assistant/chat
 * Query the AirMate intelligent travel assistant.
 * Transparently answers about real flights and the caller's own bookings.
 */
router.post("/chat", optionalAuth, async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "BadRequest", message: "Query text is required" });
    }

    const userId = req.user ? req.user.id : null;
    const userEmail = req.user ? req.user.email : null;
    const userName = req.user ? req.user.name : "Traveler";

    const response = await answerAssistantQuery({
      query,
      userId,
      userEmail,
      userName,
    });

    res.json(response);
  } catch (error) {
    logger.error(`Assistant query failed: ${error.message}`);
    next(error);
  }
});

export default router;
