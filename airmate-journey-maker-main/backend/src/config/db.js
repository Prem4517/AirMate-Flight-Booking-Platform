import dns from "node:dns";
import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

// Ensure DNS SRV queries resolve reliably on Windows
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // ignore if already configured
}

let dbConnected = false;

export function isDBConnected() {
  return dbConnected;
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.warn("MONGODB_URI is not defined. Using in-memory fallback mode.");
    return false;
  }

  const dbName = process.env.MONGODB_DB_NAME || "airmate";

  try {
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 8000,
      autoIndex: true,
    });
    dbConnected = true;
    logger.info(`MongoDB connected: ${mongoose.connection.host} (database: ${dbName})`);
    return true;
  } catch (error) {
    dbConnected = false;
    logger.warn(`MongoDB connection failed: ${error.message}`);
    logger.warn("Continuing in in-memory fallback mode so the server remains fully functional.");
    logger.warn("To use MongoDB Atlas, add your current IP address (or 0.0.0.0/0) in MongoDB Atlas Network Access.");
    return false;
  }
}

mongoose.connection.on("connected", () => {
  dbConnected = true;
});

mongoose.connection.on("disconnected", () => {
  dbConnected = false;
  logger.info("MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  logger.error(`MongoDB error: ${err.message}`);
});

export async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.close(false);
      dbConnected = false;
      logger.info("MongoDB connection closed gracefully.");
    } catch (err) {
      logger.error(`Error closing MongoDB: ${err.message}`);
    }
  }
}

