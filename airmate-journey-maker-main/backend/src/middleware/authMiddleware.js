import { verifyToken, findUserById } from "../services/authService.js";
import { logger } from "../utils/logger.js";

// Rate limiting state: map of IP -> { count: number, resetAt: number }
const loginAttemptMap = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function loginRateLimiter(req, res, next) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local";
  const now = Date.now();
  const record = loginAttemptMap.get(ip);

  if (record) {
    if (now < record.resetAt) {
      if (record.count >= MAX_ATTEMPTS) {
        const remainingSec = Math.ceil((record.resetAt - now) / 1000);
        return res.status(429).json({
          error: "TooManyRequests",
          message: `Too many login attempts. Please try again after ${remainingSec} seconds.`,
          retryAfter: remainingSec,
        });
      }
    } else {
      // Window expired, reset
      loginAttemptMap.set(ip, { count: 0, resetAt: now + WINDOW_MS });
    }
  } else {
    loginAttemptMap.set(ip, { count: 0, resetAt: now + WINDOW_MS });
  }

  next();
}

export function recordFailedLogin(req) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local";
  const now = Date.now();
  const record = loginAttemptMap.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  record.count += 1;
  loginAttemptMap.set(ip, record);
}

export function recordSuccessfulLogin(req) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local";
  loginAttemptMap.delete(ip);
}

/**
 * Validates JWT bearer token and attaches req.user
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication token missing or invalid",
    });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Session expired or invalid token. Please log in again.",
    });
  }

  const user = await findUserById(decoded.id);
  if (!user) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "User account no longer exists",
    });
  }

  if (user.accountStatus !== "active") {
    return res.status(403).json({
      error: "Forbidden",
      message: "Account has been suspended or deactivated",
    });
  }

  req.user = user;
  next();
}

/**
 * Optional authentication - attaches user if valid token present, continues regardless
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (decoded) {
      const user = await findUserById(decoded.id);
      if (user && user.accountStatus === "active") {
        req.user = user;
      }
    }
  }
  next();
}

/**
 * Server-side role authorization check
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `Access denied for user ${req.user.email} (role: ${req.user.role}) to ${req.originalUrl}. Required: ${allowedRoles.join(", ")}`
      );
      return res.status(403).json({
        error: "Forbidden",
        message: "Access denied: You do not have permission to access this resource",
        requiredRole: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
}

export const requireAdmin = requireRole("admin");
export const requireCustomer = requireRole("customer", "admin");
