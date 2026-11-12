import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      unique: true,
      required: true,
      index: true,
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
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount must be non-negative"],
    },
    currency: {
      type: String,
      default: "INR",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "netbanking", "wallet", "stripe", "mock"],
      default: "card",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "failed", "refunded"],
      default: "pending",
    },
    transactionId: {
      type: String,
      default: "",
    },
    stripePaymentIntentId: {
      type: String,
      default: "",
    },
    paymentDetails: {
      cardLast4: { type: String, default: "" },
      cardBrand: { type: String, default: "" },
      upiId: { type: String, default: "" },
      bankName: { type: String, default: "" },
    },
    errorMessage: {
      type: String,
      default: "",
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ status: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });

export const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
