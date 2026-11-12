import dns from "node:dns";
import dotenv from "dotenv";
dotenv.config();

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  const targetDbName = process.env.MONGODB_DB_NAME || "airmate";
  console.log(`[Migration] Connecting to cluster... target database: ${targetDbName}`);

  // Connect to source 'test' database
  const sourceConn = await mongoose.createConnection(uri, { dbName: "test" }).asPromise();
  const targetConn = await mongoose.createConnection(uri, { dbName: targetDbName }).asPromise();

  console.log("[Migration] Checking source (test) vs target (" + targetDbName + ")...");

  const sourceCols = await sourceConn.db.listCollections().toArray();
  console.log(`[Migration] Source collections in 'test':`, sourceCols.map((c) => c.name));

  for (const col of sourceCols) {
    const colName = col.name;
    const sourceCount = await sourceConn.db.collection(colName).countDocuments();
    const targetCount = await targetConn.db.collection(colName).countDocuments();

    console.log(`  Collection '${colName}': source has ${sourceCount}, target has ${targetCount}`);

    if (sourceCount > 0 && targetCount === 0) {
      console.log(`  -> Migrating ${sourceCount} records from test.${colName} to ${targetDbName}.${colName}...`);
      const docs = await sourceConn.db.collection(colName).find({}).toArray();
      await targetConn.db.collection(colName).insertMany(docs);
      console.log(`  -> Successfully migrated '${colName}'.`);
    } else if (sourceCount > 0 && targetCount > 0) {
      console.log(`  -> Target already contains ${targetCount} records. Preserving existing records without overwriting.`);
    }
  }

  await sourceConn.close();
  await targetConn.close();
  console.log("[Migration] Data migration check complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("[Migration] Error:", err.message);
  process.exit(1);
});
