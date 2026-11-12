import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name must not exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
    },
    role: {
      type: String,
      enum: {
        values: ["customer", "admin"],
        message: "{VALUE} is not a valid role",
      },
      default: "customer",
    },
    accountStatus: {
      type: String,
      enum: {
        values: ["active", "suspended", "pending"],
        message: "{VALUE} is not a valid account status",
      },
      default: "active",
    },
    phone: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
    nationality: { type: String, default: "Indian" },
    passportNumber: { type: String, default: "" },
    passportExpiry: { type: String, default: "" },
    frequentFlyerNumber: { type: String, default: "" },
    address: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
      country: { type: String, default: "India" },
    },
    emergencyContact: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      relationship: { type: String, default: "" },
    },
    preferences: {
      seat: { type: String, enum: ["window", "aisle", "middle", "any"], default: "any" },
      meal: { type: String, enum: ["veg", "non-veg", "jain", "vegan", "diabetic", "standard"], default: "standard" },
      currency: { type: String, default: "INR" },
    },
    savedPassengers: [
      {
        id: { type: String, required: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        type: { type: String, enum: ["adult", "child", "infant"], default: "adult" },
        gender: { type: String, enum: ["male", "female", "other"], default: "male" },
        dateOfBirth: { type: String },
        nationality: { type: String, default: "Indian" },
        passportNumber: { type: String, default: "" },
        passportExpiry: { type: String, default: "" },
        frequentFlyerNumber: { type: String, default: "" },
        preferredSeat: { type: String, default: "any" },
        preferredMeal: { type: String, default: "standard" },
      },
    ],
    savedFlights: [
      {
        flightId: { type: String, required: true },
        flightNumber: { type: String, required: true },
        airline: { type: String, required: true },
        from: { type: String, required: true },
        to: { type: String, required: true },
        fromCode: { type: String, required: true },
        toCode: { type: String, required: true },
        price: { type: Number, required: true },
        targetPrice: { type: Number, default: 0 },
        alertEnabled: { type: Boolean, default: true },
        departure: { type: String },
        arrival: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to return safe JSON without passwordHash
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id ? this._id.toString() : this.id,
    name: this.name,
    email: this.email,
    role: this.role,
    accountStatus: this.accountStatus,
    phone: this.phone || "",
    dateOfBirth: this.dateOfBirth || "",
    gender: this.gender || "",
    nationality: this.nationality || "Indian",
    passportNumber: this.passportNumber || "",
    passportExpiry: this.passportExpiry || "",
    frequentFlyerNumber: this.frequentFlyerNumber || "",
    address: this.address || {},
    emergencyContact: this.emergencyContact || {},
    preferences: this.preferences || { seat: "any", meal: "standard", currency: "INR" },
    savedPassengers: this.savedPassengers || [],
    savedFlights: this.savedFlights || [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = mongoose.model("User", userSchema);
