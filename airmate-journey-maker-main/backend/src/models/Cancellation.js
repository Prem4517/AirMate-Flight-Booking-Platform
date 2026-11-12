import mongoose from "mongoose";

const cancellationSchema = new mongoose.Schema(
  {
    cancellationId: {
      type: String,
      unique: true,
      required: true,
      index: true,
      uppercase: true,
    },
    bookingRef: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
    },
    userId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    reason: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "processed", "rejected"],
      default: "pending",
    },
    cancellationFee: {
      type: Number,
      default: 0,
    },
    originalAmount: {
      type: Number,
      required: true,
    },
    refundAmount: {
      type: Number,
      required: true,
    },
    refundStatus: {
      type: String,
      enum: ["none", "pending", "processed", "completed", "rejected"],
      default: "pending",
    },
    refundTransactionId: {
      type: String,
      default: "",
    },
    refundProcessedAt: {
      type: Date,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    adminNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

cancellationSchema.index({ status: 1 });

export const Cancellation = mongoose.model("Cancellation", cancellationSchema);
export default Cancellation;
