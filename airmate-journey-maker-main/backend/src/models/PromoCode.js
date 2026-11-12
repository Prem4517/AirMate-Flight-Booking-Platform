import mongoose from "mongoose";

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Promo code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
      default: "percentage",
    },
    discountValue: {
      type: Number,
      required: true,
      min: [0, "Discount value must be positive"],
    },
    maxDiscount: {
      type: Number,
      default: 1000,
    },
    minFare: {
      type: Number,
      default: 0,
    },
    applicableClasses: {
      type: [String],
      default: ["Economy", "Premium Economy", "Business", "First Class"],
    },
    validUntil: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    tag: {
      type: String,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    maxUsage: {
      type: Number,
      default: 10000,
    },
  },
  {
    timestamps: true,
  }
);

promoCodeSchema.index({ active: 1 });

export const PromoCode = mongoose.model("PromoCode", promoCodeSchema);
export default PromoCode;
