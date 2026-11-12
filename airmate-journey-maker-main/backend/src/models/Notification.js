import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["booking_confirmed", "booking_cancelled", "flight_status", "refund_processed", "promo", "support", "system"],
      default: "system",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    bookingRef: {
      type: String,
      uppercase: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = mongoose.model("Notification", notificationSchema);
