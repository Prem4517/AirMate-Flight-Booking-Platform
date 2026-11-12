import { AuditLog } from "../models/AuditLog.js";
import { isDBConnected } from "../config/db.js";
import { logger } from "../utils/logger.js";

const inMemoryAuditLogs = [];

/**
 * Record an administrative action for security auditing.
 */
export async function logAdminAction({
  adminId,
  adminEmail,
  adminName,
  action,
  targetType,
  targetId,
  details = {},
  ipAddress = "127.0.0.1",
  userAgent = "AirMate Operations Portal",
}) {
  const entry = {
    adminId: adminId || "system",
    adminEmail: adminEmail || "admin@airmate.com",
    adminName: adminName || "Administrator",
    action,
    targetType,
    targetId: String(targetId),
    details,
    ipAddress,
    userAgent,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    if (isDBConnected()) {
      const created = await AuditLog.create(entry);
      return created.toObject();
    } else {
      entry._id = "audit_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
      entry.id = entry._id;
      inMemoryAuditLogs.unshift(entry);
      // Keep memory cap
      if (inMemoryAuditLogs.length > 500) inMemoryAuditLogs.pop();
      return entry;
    }
  } catch (error) {
    logger.error("Failed to write audit log entry:", error);
    // Never crash the primary action due to logging failure
    return entry;
  }
}

/**
 * Retrieve audit logs with filtering and pagination.
 */
export async function getAuditLogs({
  limit = 50,
  page = 1,
  action,
  targetType,
  query,
} = {}) {
  const limitNum = Math.min(Number(limit) || 50, 200);
  const pageNum = Math.max(Number(page) || 1, 1);
  const skip = (pageNum - 1) * limitNum;

  if (isDBConnected()) {
    const filter = {};
    if (action && action !== "all") filter.action = action;
    if (targetType && targetType !== "all") filter.targetType = targetType;
    if (query) {
      filter.$or = [
        { adminEmail: { $regex: query, $options: "i" } },
        { targetId: { $regex: query, $options: "i" } },
        { action: { $regex: query, $options: "i" } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return {
      logs,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  } else {
    let filtered = [...inMemoryAuditLogs];
    if (action && action !== "all") {
      filtered = filtered.filter((l) => l.action === action);
    }
    if (targetType && targetType !== "all") {
      filtered = filtered.filter((l) => l.targetType === targetType);
    }
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.adminEmail.toLowerCase().includes(q) ||
          l.targetId.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limitNum);

    return {
      logs: paginated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  }
}

export { inMemoryAuditLogs };
