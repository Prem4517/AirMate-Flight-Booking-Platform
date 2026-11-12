import mongoose from "mongoose";

const priceAlertSchema = new mongoose.Schema(
  {
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
    fromCode: {
      type: String,
      required: true,
      uppercase: true,
    },
    toCode: {
      type: String,
      required: true,
      uppercase: true,
    },
    targetPrice: {
      type: Number,
      required: true,
    },
    currentPrice: {
      type: Number,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    triggeredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

priceAlertSchema.index({ userId: 1, fromCode: 1, toCode: 1 });
priceAlertSchema.index({ active: 1 });

export const PriceAlert = mongoose.model("PriceAlert", priceAlertSchema);
export default PriceAlert;
