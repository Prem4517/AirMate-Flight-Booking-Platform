import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: String, required: true },
    adminEmail: { type: String, required: true },
    adminName: { type: String, default: "Administrator" },
    action: {
      type: String,
      required: true,
      enum: [
        "FLIGHT_CREATE",
        "FLIGHT_UPDATE",
        "FLIGHT_RESCHEDULE",
        "FLIGHT_STATUS_UPDATE",
        "FLIGHT_CANCEL",
        "FLIGHT_DELETE",
        "BOOKING_STATUS_UPDATE",
        "BOOKING_CANCEL",
        "BOOKING_REFUND",
        "USER_STATUS_UPDATE",
        "USER_ROLE_UPDATE",
        "DATA_EXPORT",
        "SYSTEM_CONFIG",
      ],
    },
    targetType: {
      type: String,
      required: true,
      enum: ["Flight", "Booking", "User", "System", "Export"],
    },
    targetId: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: "127.0.0.1" },
    userAgent: { type: String, default: "AirMate Admin Portal" },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ adminEmail: 1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
