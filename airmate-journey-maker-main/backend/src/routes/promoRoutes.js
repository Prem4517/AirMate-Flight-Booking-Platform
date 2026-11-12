import { Router } from "express";
import {
  getActivePromoCodes,
  validatePromoCode,
  calculateBaggageAllowance,
} from "../services/promoService.js";
import { PromoCode } from "../models/PromoCode.js";
import { authenticateToken, requireAdmin } from "../middleware/authMiddleware.js";

const router = Router();

/**
 * GET /api/promos
 * List active promo codes
 */
router.get("/", async (req, res, next) => {
  try {
    const promos = await getActivePromoCodes();
    res.json({
      promos,
      count: promos.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/promos/validate
 * Validate a promo code against a base fare
 */
router.post("/validate", async (req, res) => {
  try {
    const { code, baseFare, cabinClass } = req.body;
    const result = await validatePromoCode(code, Number(baseFare) || 0, cabinClass || "Economy");
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: "InvalidPromo", message: error.message });
  }
});

/**
 * Admin: Create promo code
 */
router.post("/", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const promo = await PromoCode.create(req.body);
    res.status(201).json(promo);
  } catch (error) {
    res.status(400).json({ error: "ValidationError", message: error.message });
  }
});

/**
 * Admin: Update promo code
 */
router.patch("/:code", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const clean = req.params.code.trim().toUpperCase();
    const updated = await PromoCode.findOneAndUpdate({ code: clean }, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "NotFound", message: "Promo not found" });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * Admin: Delete promo code
 */
router.delete("/:code", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const clean = req.params.code.trim().toUpperCase();
    const deleted = await PromoCode.findOneAndDelete({ code: clean });
    if (!deleted) return res.status(404).json({ error: "NotFound", message: "Promo not found" });
    res.json({ success: true, message: `Promo code ${clean} deleted` });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/promos/baggage-calculator
 * Interactive baggage allowance calculator
 */
router.post("/baggage-calculator", async (req, res) => {
  try {
    const {
      airline,
      cabinClass,
      checkinKg,
      cabinKg,
      hasSportsEquipment,
      hasMusicalInstrument,
    } = req.body;

    const result = await calculateBaggageAllowance({
      airline,
      cabinClass,
      checkinKg: Number(checkinKg) || 15,
      cabinKg: Number(cabinKg) || 7,
      hasSportsEquipment: Boolean(hasSportsEquipment),
      hasMusicalInstrument: Boolean(hasMusicalInstrument),
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: "CalculationError", message: error.message });
  }
});

export default router;
