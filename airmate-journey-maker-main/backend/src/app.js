import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import flightRoutes from "./routes/flightRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";
import promoRoutes from "./routes/promoRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { isDBConnected } from "./config/db.js";

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || origin === process.env.CORS_ORIGIN) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());

// API Health & Welcome Check
const welcomeHandler = (req, res) => {
  res.json({
    status: "OK",
    service: "AirMate Backend API",
    frontendUrl: "http://localhost:5173",
    healthCheck: "/api/health",
    database: isDBConnected() ? "connected" : "fallback",
    databaseName: process.env.MONGODB_DB_NAME || "airmate",
  });
};

app.get("/", welcomeHandler);
app.get("/api", welcomeHandler);
app.get("/api/health", welcomeHandler);
app.get("/api/v1/health", welcomeHandler);

// Standard API Routes (/api)
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/user", userRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/promos", promoRoutes);

// Versioned API Routes (/api/v1)
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/flights", flightRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/assistant", assistantRoutes);
app.use("/api/v1/promos", promoRoutes);

// Error Handling Middleware
app.use(errorHandler);

export default app;
