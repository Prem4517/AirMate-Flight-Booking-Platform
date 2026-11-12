/**
 * drop_test_db.js  (v2 — reuses the app's established DB config)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI not found in .env");
  process.exit(1);
}

// Replace /airmate with /test in the URI
const testUri = uri.includes("/airmate")
  ? uri.replace("/airmate", "/test")
  : uri.replace(/(mongodb\.net\/)(\?|$)/, "$1test$2");

console.log("🔌 Connecting to Atlas (test database)...");

const conn = await mongoose.createConnection(testUri, {
  dbName: "test",
  serverSelectionTimeoutMS: 15000,
}).asPromise();

const db = conn.db;
console.log(`✅ Connected to: ${db.databaseName}`);

const collections = await db.listCollections().toArray();
if (collections.length === 0) {
  console.log("ℹ️  'test' database is already empty. Nothing to drop.");
} else {
  console.log(`📋 Found collections: ${collections.map((c) => c.name).join(", ")}`);
  await db.dropDatabase();
  console.log("🗑️  'test' database dropped from Atlas!");
}

await conn.close();
console.log("🔌 Done.");
