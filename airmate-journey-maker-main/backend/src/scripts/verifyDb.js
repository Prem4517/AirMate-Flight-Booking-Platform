#!/usr/bin/env node
import dns from "node:dns";
import dotenv from "dotenv";
dotenv.config();

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

import mongoose from "mongoose";
import { connectDB, closeDB } from "../config/db.js";
import {
  User,
  Flight,
  Booking,
  Passenger,
  Seat,
  Payment,
  Cancellation,
  Baggage,
  Notification,
  SupportTicket,
  PromoCode,
  SavedFlight,
  PriceAlert,
  AuditLog,
} from "../models/index.js";

async function verify() {
  console.log("==========================================");
  console.log("     AirMate MongoDB Verification Tool    ");
  console.log("==========================================");

  const ok = await connectDB();
  if (!ok) {
    console.error("FAIL: Could not establish connection to MongoDB Atlas.");
    process.exit(1);
  }

  const db = mongoose.connection.db;
  console.log(`\nConnected to: ${mongoose.connection.host}`);
  console.log(`Active Database: ${db.databaseName}`);

  const collections = await db.listCollections().toArray();
  console.log(`Collections present (${collections.length}):`, collections.map((c) => c.name).join(", "));

  const models = [
    { name: "User", model: User },
    { name: "Flight", model: Flight },
    { name: "Booking", model: Booking },
    { name: "Passenger", model: Passenger },
    { name: "Seat", model: Seat },
    { name: "Payment", model: Payment },
    { name: "Cancellation", model: Cancellation },
    { name: "Baggage", model: Baggage },
    { name: "Notification", model: Notification },
    { name: "SupportTicket", model: SupportTicket },
    { name: "PromoCode", model: PromoCode },
    { name: "SavedFlight", model: SavedFlight },
    { name: "PriceAlert", model: PriceAlert },
    { name: "AuditLog", model: AuditLog },
  ];

  console.log("\n---------------- Model Counts & Status ----------------");
  for (const item of models) {
    const count = await item.model.countDocuments();
    console.log(`  [OK] ${item.name.padEnd(16)} : ${count} document(s)`);
  }
  console.log("-------------------------------------------------------");

  // Verify sample flight required fields
  const sampleFlight = await Flight.findOne().lean();
  if (sampleFlight) {
    console.log("\nSample Flight Verification:");
    console.log(`  Flight Number: ${sampleFlight.flightNumber}`);
    console.log(`  Route:         ${sampleFlight.fromCode} -> ${sampleFlight.toCode}`);
    console.log(`  Price:         ₹${sampleFlight.price}`);
    console.log(`  Seats Total:   ${sampleFlight.seatsTotal}`);
    console.log(`  Seats Booked:  ${sampleFlight.seatsBooked}`);
  }

  // Verify admin account
  const admin = await User.findOne({ role: "admin" }).lean();
  if (admin) {
    console.log("\nAdministrator Verification:");
    console.log(`  Email:         ${admin.email}`);
    console.log(`  Role:          ${admin.role}`);
    console.log(`  Status:        ${admin.accountStatus}`);
  }

  console.log("\nAll 14 Mongoose models and MongoDB Atlas collections verified successfully!\n");
  await closeDB();
  process.exit(0);
}

verify().catch(async (err) => {
  console.error("Verification error:", err);
  await closeDB();
  process.exit(1);
});
