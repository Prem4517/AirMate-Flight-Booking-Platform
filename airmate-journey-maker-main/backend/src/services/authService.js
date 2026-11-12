import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { isDBConnected } from "../config/db.js";
import { logger } from "../utils/logger.js";

const JWT_SECRET = process.env.JWT_SECRET || "airmate_fallback_secret_key_2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// In-memory user store fallback when MongoDB is not connected
export const inMemoryUsers = new Map();

export async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, 10);
}

export async function comparePassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

export function generateToken(user) {
  const payload = {
    id: user._id ? user._id.toString() : user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accountStatus: user.accountStatus,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Trusted server-side admin creation
 */
export async function seedInitialAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@airmate.com").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@AirMate2026!";
  const adminName = "AirMate System Administrator";

  try {
    if (isDBConnected()) {
      const existingAdmin = await User.findOne({ email: adminEmail });
      if (!existingAdmin) {
        const passwordHash = await hashPassword(adminPassword);
        const adminUser = await User.create({
          name: adminName,
          email: adminEmail,
          passwordHash,
          role: "admin",
          accountStatus: "active",
        });
        logger.info(`Initial administrator created in MongoDB: ${adminUser.email}`);
      } else {
        logger.info(`Administrator account exists in MongoDB: ${adminEmail}`);
      }
    } else {
      if (!inMemoryUsers.has(adminEmail)) {
        const passwordHash = await hashPassword(adminPassword);
        const adminUser = {
          id: "admin-system-1",
          _id: "admin-system-1",
          name: adminName,
          email: adminEmail,
          passwordHash,
          role: "admin",
          accountStatus: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        inMemoryUsers.set(adminEmail, adminUser);
        logger.info(`Initial administrator initialized (in-memory): ${adminEmail}`);
      }
    }
  } catch (error) {
    logger.error(`Error creating initial administrator: ${error.message}`);
  }
}

/**
 * Public registration: CUSTOMER ONLY.
 * Never accepts arbitrary role from input.
 */
export async function registerCustomer({ name, email, password }) {
  if (!name || !email || !password) {
    throw new Error("Name, email, and password are required");
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanName = name.trim();

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  // Check if user already exists
  if (isDBConnected()) {
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      throw new Error("An account with this email already exists");
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: "customer", // Strict customer role enforcement
      accountStatus: "active",
    });

    return {
      user: user.toSafeObject(),
      token: generateToken(user),
    };
  } else {
    if (inMemoryUsers.has(cleanEmail)) {
      throw new Error("An account with this email already exists");
    }

    const passwordHash = await hashPassword(password);
    const id = "cust-" + Date.now();
    const user = {
      id,
      _id: id,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: "customer", // Strict customer role enforcement
      accountStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryUsers.set(cleanEmail, user);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      user: safeUser,
      token: generateToken(user),
    };
  }
}

/**
 * Customer login
 */
export async function authenticateCustomer({ email, password }) {
  const cleanEmail = (email || "").toLowerCase().trim();
  let user = null;

  if (isDBConnected()) {
    user = await User.findOne({ email: cleanEmail });
  } else {
    user = inMemoryUsers.get(cleanEmail);
  }

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.accountStatus !== "active") {
    throw new Error("Account is suspended or inactive. Please contact support.");
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  const safeUser = {
    id: user._id ? user._id.toString() : user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus,
  };

  return {
    user: safeUser,
    token: generateToken(user),
  };
}

/**
 * Admin login - strictly requires role === 'admin'
 */
export async function authenticateAdmin({ email, password }) {
  const cleanEmail = (email || "").toLowerCase().trim();
  let user = null;

  if (isDBConnected()) {
    user = await User.findOne({ email: cleanEmail });
  } else {
    user = inMemoryUsers.get(cleanEmail);
  }

  if (!user) {
    throw new Error("Invalid administrator credentials");
  }

  if (user.role !== "admin") {
    // Crucial: Reject customer credentials trying to log into the admin portal
    throw new Error("Access denied: Administrator privileges required");
  }

  if (user.accountStatus !== "active") {
    throw new Error("Administrator account is suspended or inactive");
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new Error("Invalid administrator credentials");
  }

  const safeUser = {
    id: user._id ? user._id.toString() : user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus,
  };

  return {
    user: safeUser,
    token: generateToken(user),
  };
}

/**
 * Find user by ID
 */
export async function findUserById(id) {
  if (isDBConnected()) {
    const isValidObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    if (!isValidObjectId) return null;
    const user = await User.findById(id);
    return user ? user.toSafeObject() : null;
  } else {
    for (const u of inMemoryUsers.values()) {
      if (u.id === id || u._id === id) {
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          accountStatus: u.accountStatus,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
      }
    }
    return null;
  }
}

/**
 * List all users (admin only)
 */
export async function getAllUsers() {
  if (isDBConnected()) {
    const users = await User.find().select("-passwordHash").lean();
    return users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      accountStatus: u.accountStatus,
      createdAt: u.createdAt,
    }));
  } else {
    return Array.from(inMemoryUsers.values()).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      accountStatus: u.accountStatus,
      createdAt: u.createdAt,
    }));
  }
}

/**
 * Server-side trusted utility to create an admin account programmatically
 */
export async function createAdminUser({ name, email, password }) {
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = name.trim();
  const passwordHash = await hashPassword(password);

  if (isDBConnected()) {
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.role = "admin";
      existing.name = cleanName;
      await existing.save();
      return existing.toSafeObject();
    }
    const admin = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: "admin",
      accountStatus: "active",
    });
    return admin.toSafeObject();
  } else {
    const id = "admin-" + Date.now();
    const admin = {
      id,
      _id: id,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: "admin",
      accountStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryUsers.set(cleanEmail, admin);
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      accountStatus: admin.accountStatus,
    };
  }
}

/**
 * Search and paginate users for admin management.
 */
export async function adminSearchUsers({
  query = "",
  role = "all",
  accountStatus = "all",
  page = 1,
  limit = 20,
} = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  if (isDBConnected()) {
    const filter = {};
    if (role && role !== "all") filter.role = role;
    if (accountStatus && accountStatus !== "all") filter.accountStatus = accountStatus;
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    const formatted = users.map((u) => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      accountStatus: u.accountStatus,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return {
      users: formatted,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  } else {
    let list = Array.from(inMemoryUsers.values()).map((u) => ({
      id: u.id || (u._id ? u._id.toString() : ""),
      _id: u.id || (u._id ? u._id.toString() : ""),
      name: u.name,
      email: u.email,
      role: u.role,
      accountStatus: u.accountStatus,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    if (role && role !== "all") list = list.filter((u) => u.role === role);
    if (accountStatus && accountStatus !== "all") list = list.filter((u) => u.accountStatus === accountStatus);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }

    const total = list.length;
    const paginated = list.slice(skip, skip + limitNum);

    return {
      users: paginated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  }
}

/**
 * Update user account status (active, suspended, pending) with safety checks.
 */
export async function adminUpdateUserStatus(userId, newStatus, requestingAdmin) {
  if (!["active", "suspended", "pending"].includes(newStatus)) {
    throw new Error("Invalid account status: must be active, suspended, or pending");
  }

  if (isDBConnected()) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (user._id.toString() === requestingAdmin.id && newStatus !== "active") {
      throw new Error("Administrators cannot suspend or deactivate their own account");
    }

    user.accountStatus = newStatus;
    await user.save();
    return user.toSafeObject();
  } else {
    let found = null;
    for (const u of inMemoryUsers.values()) {
      if (u.id === userId || u._id === userId) {
        found = u;
        break;
      }
    }
    if (!found) throw new Error("User not found");

    if ((found.id === requestingAdmin.id || found.email === requestingAdmin.email) && newStatus !== "active") {
      throw new Error("Administrators cannot suspend or deactivate their own account");
    }

    found.accountStatus = newStatus;
    found.updatedAt = new Date().toISOString();
    return {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      accountStatus: found.accountStatus,
    };
  }
}

/**
 * Update user role (customer <-> admin) with safety checks.
 */
export async function adminUpdateUserRole(userId, newRole, requestingAdmin) {
  if (!["customer", "admin"].includes(newRole)) {
    throw new Error("Invalid role: must be customer or admin");
  }

  if (isDBConnected()) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (user._id.toString() === requestingAdmin.id && newRole !== "admin") {
      throw new Error("Administrators cannot demote themselves from admin role");
    }

    if (user.role === "admin" && newRole === "customer") {
      const adminCount = await User.countDocuments({ role: "admin", accountStatus: "active" });
      if (adminCount <= 1) {
        throw new Error("Cannot demote the last remaining active administrator");
      }
    }

    user.role = newRole;
    await user.save();
    return user.toSafeObject();
  } else {
    let found = null;
    for (const u of inMemoryUsers.values()) {
      if (u.id === userId || u._id === userId) {
        found = u;
        break;
      }
    }
    if (!found) throw new Error("User not found");

    if ((found.id === requestingAdmin.id || found.email === requestingAdmin.email) && newRole !== "admin") {
      throw new Error("Administrators cannot demote themselves from admin role");
    }

    if (found.role === "admin" && newRole === "customer") {
      const adminCount = Array.from(inMemoryUsers.values()).filter(
        (u) => u.role === "admin" && u.accountStatus === "active"
      ).length;
      if (adminCount <= 1) {
        throw new Error("Cannot demote the last remaining active administrator");
      }
    }

    found.role = newRole;
    found.updatedAt = new Date().toISOString();
    return {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      accountStatus: found.accountStatus,
    };
  }
}

