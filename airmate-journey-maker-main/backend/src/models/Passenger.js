import mongoose from "mongoose";

const passengerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      index: true,
    },
    bookingRef: {
      type: String,
      index: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ["adult", "child", "infant"],
      default: "adult",
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "male",
    },
    dateOfBirth: {
      type: String, // YYYY-MM-DD
    },
    nationality: {
      type: String,
      default: "Indian",
    },
    passportNumber: {
      type: String,
      default: "",
    },
    passportExpiry: {
      type: String,
      default: "",
    },
    frequentFlyerNumber: {
      type: String,
      default: "",
    },
    seatNumber: {
      type: String,
      default: "",
    },
    mealPreference: {
      type: String,
      default: "standard",
    },
    specialAssistance: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

passengerSchema.index({ userId: 1, createdAt: -1 });

export const Passenger = mongoose.model("Passenger", passengerSchema);
export default Passenger;
