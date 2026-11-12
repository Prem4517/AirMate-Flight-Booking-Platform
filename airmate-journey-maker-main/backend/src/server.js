import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectDB, closeDB } from "./config/db.js";
import { seedFlightsIfEmpty } from "./services/flightService.js";
import { seedInitialAdmin } from "./services/authService.js";
import { seedPromoCodesIfEmpty } from "./services/promoService.js";
import { logger } from "./utils/logger.js";

const PORT = process.env.PORT || 5000;

let server;

async function startServer() {
  try {
    await connectDB();
    await seedFlightsIfEmpty();
    await seedInitialAdmin();
    await seedPromoCodesIfEmpty();
    server = app.listen(PORT, () => {
      logger.info(`AirMate Backend server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

async function handleShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await closeDB();
      logger.info("Process terminated cleanly.");
      process.exit(0);
    });
  } else {
    await closeDB();
    process.exit(0);
  }
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

startServer();
