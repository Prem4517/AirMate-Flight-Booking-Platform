import { Router } from "express";
import {
  customerRegisterHandler,
  customerLoginHandler,
  adminLoginHandler,
  getCurrentUserHandler,
  logoutHandler,
  listUsersHandler,
} from "../controllers/authController.js";
import {
  authenticateToken,
  requireAdmin,
  loginRateLimiter,
} from "../middleware/authMiddleware.js";

const router = Router();

// Public customer routes
router.post("/register", loginRateLimiter, customerRegisterHandler);
router.post("/login", loginRateLimiter, customerLoginHandler);

// Dedicated administrator login route
router.post("/admin/login", loginRateLimiter, adminLoginHandler);

// Protected user routes
router.get("/me", authenticateToken, getCurrentUserHandler);
router.post("/logout", authenticateToken, logoutHandler);

// Protected admin routes
router.get("/admin/users", authenticateToken, requireAdmin, listUsersHandler);

export default router;
