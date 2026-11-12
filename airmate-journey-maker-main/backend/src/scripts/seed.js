#!/usr/bin/env node
import dns from "node:dns";
import dotenv from "dotenv";
dotenv.config();

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

import { connectDB, closeDB } from "../config/db.js";
import { seedFlightsIfEmpty } from "../services/flightService.js";
import { seedInitialAdmin } from "../services/authService.js";
import { seedPromoCodesIfEmpty } from "../services/promoService.js";
import { Flight } from "../models/Flight.js";
import { User } from "../models/User.js";
import { PromoCode } from "../models/PromoCode.js";
import { Booking } from "../models/Booking.js";
import { Seat } from "../models/Seat.js";
import { Payment } from "../models/Payment.js";
import { Baggage } from "../models/Baggage.js";
import { logger } from "../utils/logger.js";

const INITIAL_BAGGAGE_POLICIES = [
  {
    airline: "Air India",
    cabinClass: "Economy",
    includedCabinKg: 7,
    includedCheckinKg: 20,
    extraKgPrice: 550,
    allowedExtraTiers: [
      { kg: 5, price: 2750 },
      { kg: 10, price: 5500 },
      { kg: 15, price: 8250 },
    ],
  },
  {
    airline: "Air India",
    cabinClass: "Business",
    includedCabinKg: 12,
    includedCheckinKg: 35,
    extraKgPrice: 750,
    allowedExtraTiers: [
      { kg: 5, price: 3750 },
      { kg: 10, price: 7500 },
    ],
  },
  {
    airline: "IndiGo",
    cabinClass: "Economy",
    includedCabinKg: 7,
    includedCheckinKg: 15,
    extraKgPrice: 500,
    allowedExtraTiers: [
      { kg: 5, price: 2500 },
      { kg: 10, price: 5000 },
      { kg: 15, price: 7500 },
    ],
  },
  {
    airline: "Vistara",
    cabinClass: "Economy",
    includedCabinKg: 7,
    includedCheckinKg: 15,
    extraKgPrice: 500,
    allowedExtraTiers: [
      { kg: 5, price: 2500 },
      { kg: 10, price: 5000 },
    ],
  },
  {
    airline: "Vistara",
    cabinClass: "Premium Economy",
    includedCabinKg: 10,
    includedCheckinKg: 20,
    extraKgPrice: 600,
    allowedExtraTiers: [
      { kg: 5, price: 3000 },
      { kg: 10, price: 6000 },
    ],
  },
  {
    airline: "AirMate Express",
    cabinClass: "Economy",
    includedCabinKg: 7,
    includedCheckinKg: 15,
    extraKgPrice: 500,
    allowedExtraTiers: [
      { kg: 5, price: 2500 },
      { kg: 10, price: 5000 },
      { kg: 15, price: 7500 },
    ],
  },
  {
    airline: "AirMate Connect",
    cabinClass: "Economy",
    includedCabinKg: 7,
    includedCheckinKg: 15,
    extraKgPrice: 500,
    allowedExtraTiers: [
      { kg: 5, price: 2500 },
      { kg: 10, price: 5000 },
    ],
  },
  {
    airline: "Akasa Air",
    cabinClass: "Economy",
    includedCabinKg: 7,
    includedCheckinKg: 15,
    extraKgPrice: 450,
    allowedExtraTiers: [
      { kg: 5, price: 2250 },
      { kg: 10, price: 4500 },
    ],
  },
];

async function seedBaggagePoliciesIfEmpty() {
  try {
    const count = await Baggage.countDocuments();
    if (count === 0) {
      console.log("Seeding initial baggage policies...");
      await Baggage.insertMany(INITIAL_BAGGAGE_POLICIES);
      console.log(`Successfully seeded ${INITIAL_BAGGAGE_POLICIES.length} baggage policies`);
    } else {
      console.log(`MongoDB already has ${count} baggage policies`);
    }
  } catch (error) {
    console.error(`Error seeding baggage policies: ${error.message}`);
  }
}

async function main() {
  console.log("==========================================");
  console.log("       AirMate MongoDB Seed Script        ");
  console.log("==========================================");

  const connected = await connectDB();
  if (!connected) {
    console.error("Failed to connect to MongoDB Atlas. Please verify MONGODB_URI and IP whitelist.");
    process.exit(1);
  }

  console.log("\n[1/3] Checking & Seeding Flight Catalog (idempotent)...");
  await seedFlightsIfEmpty();
  const flightCount = await Flight.countDocuments();
  console.log(`  -> Total flights in database: ${flightCount}`);

  console.log("\n[2/3] Checking & Seeding Initial Administrator...");
  await seedInitialAdmin();
  const adminCount = await User.countDocuments({ role: "admin" });
  console.log(`  -> Total admin accounts: ${adminCount}`);

  console.log("\n[3/4] Checking & Seeding Promo Codes...");
  await seedPromoCodesIfEmpty();
  const promoCount = await PromoCode.countDocuments();
  console.log(`  -> Total active promo codes: ${promoCount}`);

  console.log("\n[4/4] Checking & Seeding Baggage Policies...");
  await seedBaggagePoliciesIfEmpty();
  const baggageCount = await Baggage.countDocuments();
  console.log(`  -> Total baggage policies: ${baggageCount}`);

  console.log("\n---------------- Database Summary ----------------");
  console.log(`  Flights:       ${flightCount}`);
  console.log(`  Users:         ${await User.countDocuments()}`);
  console.log(`  Promo Codes:   ${promoCount}`);
  console.log(`  Baggage Policies: ${baggageCount}`);
  console.log(`  Bookings:      ${await Booking.countDocuments()}`);
  console.log(`  Seats:         ${await Seat.countDocuments()}`);
  console.log(`  Payments:      ${await Payment.countDocuments()}`);
  console.log("--------------------------------------------------");
  console.log("Seed script executed successfully!\n");

  await closeDB();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Seed error:", err);
  await closeDB();
  process.exit(1);
});
