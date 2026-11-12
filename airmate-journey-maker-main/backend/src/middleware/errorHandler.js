import { logger } from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
  logger.error(err.stack || err.message);

  const statusCode = err.status || err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
}
