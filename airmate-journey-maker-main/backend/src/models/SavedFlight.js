import mongoose from "mongoose";

const savedFlightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
      index: true,
    },
    flightId: {
      type: String,
      required: true,
    },
    flightNumber: {
      type: String,
      required: true,
      uppercase: true,
    },
    airline: {
      type: String,
      required: true,
    },
    from: {
      type: String,
      required: true,
    },
    to: {
      type: String,
      required: true,
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
    price: {
      type: Number,
      required: true,
    },
    targetPrice: {
      type: Number,
      default: 0,
    },
    alertEnabled: {
      type: Boolean,
      default: true,
    },
    departure: {
      type: String,
    },
    arrival: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

savedFlightSchema.index({ userId: 1, flightId: 1 }, { unique: true });

export const SavedFlight = mongoose.model("SavedFlight", savedFlightSchema);
export default SavedFlight;
