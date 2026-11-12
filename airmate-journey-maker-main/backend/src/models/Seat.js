import mongoose from "mongoose";

const seatSchema = new mongoose.Schema(
  {
    flightId: {
      type: String,
      required: true,
      index: true,
    },
    seatNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    row: {
      type: Number,
      required: true,
    },
    column: {
      type: String,
      required: true,
      uppercase: true,
    },
    cabinClass: {
      type: String,
      enum: ["Economy", "Premium Economy", "Business", "First Class"],
      default: "Economy",
    },
    type: {
      type: String,
      enum: ["window", "middle", "aisle", "extra-legroom"],
      default: "window",
    },
    price: {
      type: Number,
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isBooked: {
      type: Boolean,
      default: false,
    },
    bookingRef: {
      type: String,
      default: null,
      uppercase: true,
    },
    userId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

seatSchema.index({ flightId: 1, seatNumber: 1 }, { unique: true });
seatSchema.index({ flightId: 1, isAvailable: 1 });

export const Seat = mongoose.model("Seat", seatSchema);
export default Seat;
