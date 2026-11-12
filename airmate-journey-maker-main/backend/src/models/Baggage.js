import mongoose from "mongoose";

const baggageSchema = new mongoose.Schema(
  {
    airline: {
      type: String,
      required: true,
      trim: true,
    },
    cabinClass: {
      type: String,
      required: true,
      default: "Economy",
    },
    includedCabinKg: {
      type: Number,
      default: 7,
    },
    includedCheckinKg: {
      type: Number,
      default: 15,
    },
    extraKgPrice: {
      type: Number,
      default: 450, // standard ₹450 per kg
    },
    allowedExtraTiers: [
      {
        kg: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

baggageSchema.index({ airline: 1, cabinClass: 1 }, { unique: true });

export const Baggage = mongoose.model("Baggage", baggageSchema);
export default Baggage;
