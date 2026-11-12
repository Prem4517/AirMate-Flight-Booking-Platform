import { PromoCode } from "../models/PromoCode.js";
import { Baggage } from "../models/Baggage.js";
import { isDBConnected } from "../config/db.js";
import { logger } from "../utils/logger.js";

/**
 * Active AirMate Promo Codes (fallback seed)
 */
export const ACTIVE_PROMO_CODES = [
  {
    code: "AIRMATE10",
    title: "10% Off All Flights",
    description: "Enjoy 10% instant discount up to ₹1,000 on any domestic flight booking.",
    discountType: "percentage",
    discountValue: 10,
    maxDiscount: 1000,
    minFare: 2000,
    validUntil: "2026-12-31",
    tag: "Most Popular",
  },
  {
    code: "FIRSTFLY",
    title: "First Booking Privilege",
    description: "Flat ₹750 off on your very first air ticket purchase with AirMate.",
    discountType: "flat",
    discountValue: 750,
    maxDiscount: 750,
    minFare: 3000,
    validUntil: "2026-12-31",
    tag: "New User",
  },
  {
    code: "FESTIVE500",
    title: "Festive Gateway Saver",
    description: "Save flat ₹500 on family or group bookings of 2 or more passengers.",
    discountType: "flat",
    discountValue: 500,
    maxDiscount: 500,
    minFare: 4000,
    validUntil: "2026-11-30",
    tag: "Limited Time",
  },
  {
    code: "BUSINESS20",
    title: "Premium & Business Class",
    description: "Get 20% instant discount up to ₹2,500 on Premium Economy and Business Class fares.",
    discountType: "percentage",
    discountValue: 20,
    maxDiscount: 2500,
    minFare: 7000,
    validUntil: "2026-12-31",
    tag: "Luxury",
  },
];

/**
 * Seed promo codes into MongoDB if empty
 */
export async function seedPromoCodesIfEmpty() {
  if (!isDBConnected()) return;
  try {
    const count = await PromoCode.countDocuments();
    if (count === 0) {
      await PromoCode.insertMany(ACTIVE_PROMO_CODES);
      logger.info(`Successfully seeded ${ACTIVE_PROMO_CODES.length} promo codes into MongoDB`);
    }
  } catch (err) {
    logger.error(`Error seeding promo codes: ${err.message}`);
  }
}

/**
 * Get active promo codes from MongoDB or fallback
 */
export async function getActivePromoCodes() {
  if (isDBConnected()) {
    try {
      const promos = await PromoCode.find({ active: true }).lean();
      if (promos && promos.length > 0) return promos;
    } catch (e) {
      logger.warn(`Could not fetch promos from DB: ${e.message}`);
    }
  }
  return ACTIVE_PROMO_CODES;
}

/**
 * Validate promo code against booking fare
 */
export async function validatePromoCode(code, baseFare = 0, cabinClass = "Economy") {
  if (!code) {
    throw new Error("Promo code is required");
  }

  const clean = code.trim().toUpperCase();
  let promo;

  if (isDBConnected()) {
    promo = await PromoCode.findOne({ code: clean, active: true }).lean();
  }

  if (!promo) {
    promo = ACTIVE_PROMO_CODES.find((p) => p.code === clean);
  }

  if (!promo) {
    throw new Error(`Invalid promo code "${clean}". Please check and try again.`);
  }

  if (baseFare < promo.minFare) {
    throw new Error(
      `Promo code "${clean}" requires a minimum fare of ₹${promo.minFare.toLocaleString("en-IN")}. Current fare: ₹${baseFare.toLocaleString("en-IN")}.`
    );
  }

  if (promo.code === "BUSINESS20" && cabinClass === "Economy") {
    throw new Error(`Promo code "${clean}" is only valid on Premium Economy or Business Class fares.`);
  }

  let discount = 0;
  if (promo.discountType === "percentage") {
    discount = Math.min(promo.maxDiscount, Math.round((baseFare * promo.discountValue) / 100));
  } else {
    discount = Math.min(baseFare, promo.discountValue);
  }

  const finalFare = Math.max(0, baseFare - discount);

  return {
    valid: true,
    code: promo.code,
    title: promo.title,
    discount,
    finalFare,
    message: `Promo code "${clean}" applied successfully! You saved ₹${discount.toLocaleString("en-IN")}.`,
  };
}

/**
 * Interactive baggage calculator
 */
export async function calculateBaggageAllowance({
  airline = "AirMate Express",
  cabinClass = "Economy",
  checkinKg = 15,
  cabinKg = 7,
  hasSportsEquipment = false,
  hasMusicalInstrument = false,
}) {
  let policy = null;
  
  // Try to fetch from MongoDB first
  if (isDBConnected()) {
    try {
      policy = await Baggage.findOne({
        airline: { $regex: new RegExp(`^${airline}$`, "i") },
        cabinClass: { $regex: new RegExp(`^${cabinClass}$`, "i") }
      }).lean();
    } catch (err) {
      logger.warn(`Could not fetch baggage policy from DB: ${err.message}`);
    }
  }

  // Fallback to hardcoded rules if no DB policy found
  const airlineRules = {
    "Air India": { standardCheckin: 20, standardCabin: 7, excessCheckinRate: 550, excessCabinRate: 800 },
    "Vistara": { standardCheckin: 15, standardCabin: 7, excessCheckinRate: 500, excessCabinRate: 750 },
    "IndiGo": { standardCheckin: 15, standardCabin: 7, excessCheckinRate: 500, excessCabinRate: 700 },
    "Akasa Air": { standardCheckin: 15, standardCabin: 7, excessCheckinRate: 450, excessCabinRate: 700 },
    "AirMate Express": { standardCheckin: 15, standardCabin: 7, excessCheckinRate: 500, excessCabinRate: 750 },
    "AirMate Connect": { standardCheckin: 15, standardCabin: 7, excessCheckinRate: 500, excessCabinRate: 750 },
  };

  const rule = policy || airlineRules[airline] || airlineRules["AirMate Express"];

  // Use DB policy if available, otherwise use fallback rules
  let baseCheckinAllowance = policy ? policy.includedCheckinKg : rule.standardCheckin;
  let baseCabinAllowance = policy ? policy.includedCabinKg : rule.standardCabin;
  let excessCheckinRate = policy ? policy.extraKgPrice : rule.excessCheckinRate;
  let excessCabinRate = policy ? policy.extraKgPrice * 1.5 : rule.excessCabinRate;

  // If using fallback rules, apply cabin class multipliers
  if (!policy) {
    if (cabinClass === "Premium Economy") {
      baseCheckinAllowance += 5;
      baseCabinAllowance += 3;
    } else if (cabinClass === "Business") {
      baseCheckinAllowance += 15;
      baseCabinAllowance += 5;
    } else if (cabinClass === "First") {
      baseCheckinAllowance += 25;
      baseCabinAllowance += 7;
    }
  }

  const excessCheckin = Math.max(0, checkinKg - baseCheckinAllowance);
  const excessCabin = Math.max(0, cabinKg - baseCabinAllowance);

  const checkinFee = excessCheckin * excessCheckinRate;
  const cabinFee = excessCabin * excessCabinRate;

  let specialEquipmentFee = 0;
  if (hasSportsEquipment) specialEquipmentFee += 1200;
  if (hasMusicalInstrument) specialEquipmentFee += 1500;

  const totalExcessFee = checkinFee + cabinFee + specialEquipmentFee;

  return {
    airline,
    cabinClass,
    allowedCheckinKg: baseCheckinAllowance,
    allowedCabinKg: baseCabinAllowance,
    inputCheckinKg: checkinKg,
    inputCabinKg: cabinKg,
    excessCheckinKg: excessCheckin,
    excessCabinKg: excessCabin,
    checkinFee,
    cabinFee,
    specialEquipmentFee,
    totalExcessFee,
    dimensions: {
      cabin: "55 cm x 35 cm x 25 cm (including wheels and handles)",
      checkin: "Total linear dimensions (L + W + H) not exceeding 158 cm (62 inches)",
    },
    recommendation:
      totalExcessFee > 0
        ? `Pre-booking extra baggage online saves up to 20% compared to airport counter excess baggage rates.`
        : "Your selected baggage is within the standard free allowance.",
    source: policy ? "Database policy" : "Standard airline rules (demo)",
  };
}
