#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import { createAdminUser } from "../services/authService.js";
import { logger } from "../utils/logger.js";

async function main() {
  const args = process.argv.slice(2);
  const email = args[0] || process.env.ADMIN_EMAIL || "admin@airmate.com";
  const password = args[1] || process.env.ADMIN_PASSWORD || "Admin@AirMate2026!";
  const name = args[2] || "AirMate Administrator";

  console.log(`[Admin CLI] Initializing administrator account for ${email}...`);

  await connectDB();
  const admin = await createAdminUser({ name, email, password });
  console.log(`[Admin CLI] Success! Administrator account created/updated:`);
  console.log(`  Name:  ${admin.name}`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Role:  ${admin.role}`);
  console.log(`  Status:${admin.accountStatus}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(`[Admin CLI] Error: ${err.message}`);
  process.exit(1);
});
