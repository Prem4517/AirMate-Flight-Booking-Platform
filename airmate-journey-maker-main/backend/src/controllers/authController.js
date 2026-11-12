import {
  registerCustomer,
  authenticateCustomer,
  authenticateAdmin,
  getAllUsers,
} from "../services/authService.js";
import { recordFailedLogin, recordSuccessfulLogin } from "../middleware/authMiddleware.js";
import { logger } from "../utils/logger.js";

/**
 * Public customer registration.
 * Explicitly rejects or strips any attempt to register an admin.
 */
export async function customerRegisterHandler(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Full name, email, and password are required",
      });
    }

    // Security: Reject if someone tries to inject role in payload
    if (req.body.role && req.body.role !== "customer") {
      logger.warn(`Security alert: Attempted registration with unauthorized role '${req.body.role}' from email '${email}'`);
    }

    const result = await registerCustomer({ name, email, password });
    logger.info(`Customer registered successfully: ${result.user.email}`);

    res.status(201).json({
      message: "Customer account created successfully",
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    if (error.message.includes("already exists")) {
      return res.status(409).json({ error: "Conflict", message: error.message });
    }
    res.status(400).json({ error: "BadRequest", message: error.message });
  }
}

/**
 * Customer login handler
 */
export async function customerLoginHandler(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Email and password are required",
      });
    }

    const result = await authenticateCustomer({ email, password });
    recordSuccessfulLogin(req);
    logger.info(`Customer logged in: ${result.user.email}`);

    res.json({
      message: "Customer login successful",
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    recordFailedLogin(req);
    logger.warn(`Customer login failed for email '${req.body.email}': ${error.message}`);
    res.status(401).json({
      error: "Unauthorized",
      message: error.message,
    });
  }
}

/**
 * Administrator login handler.
 * Strictly checks that the user exists and holds role === 'admin'.
 */
export async function adminLoginHandler(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Admin email and password are required",
      });
    }

    const result = await authenticateAdmin({ email, password });
    recordSuccessfulLogin(req);
    logger.info(`Administrator logged in: ${result.user.email}`);

    res.json({
      message: "Administrator login successful",
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    recordFailedLogin(req);
    logger.warn(`Admin login failed for '${req.body.email}': ${error.message}`);
    const statusCode = error.message.includes("Administrator privileges required") ? 403 : 401;
    res.status(statusCode).json({
      error: statusCode === 403 ? "Forbidden" : "Unauthorized",
      message: error.message,
    });
  }
}

/**
 * Get current authenticated user profile
 */
export async function getCurrentUserHandler(req, res) {
  res.json({
    user: req.user,
  });
}

/**
 * Logout handler - invalidates client session
 */
export async function logoutHandler(req, res) {
  res.json({
    message: "Logged out successfully",
  });
}

/**
 * List all registered users (Admin only)
 */
export async function listUsersHandler(req, res, next) {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
}
