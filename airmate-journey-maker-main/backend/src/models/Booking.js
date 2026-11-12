import mongoose from "mongoose";

/**
 * Passenger sub-document schema
 */
const passengerSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["adult", "child", "infant"], default: "adult" },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: String }, // YYYY-MM-DD
    gender: { type: String, enum: ["male", "female", "other"], default: "male" },
    nationality: { type: String, default: "Indian" },
    passportNumber: { type: String },
    passportExpiry: { type: String }, // YYYY-MM-DD
  },
  { _id: false }
);

/**
 * Fare breakdown sub-document
 */
const fareBreakdownSchema = new mongoose.Schema(
  {
    baseFare: { type: Number, required: true },
    fuelSurcharge: { type: Number, default: 0 },
    airportTaxes: { type: Number, default: 0 },
    userDevelopmentFee: { type: Number, default: 0 },
    seatFee: { type: Number, default: 0 },
    baggageFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
  },
  { _id: false }
);

/**
 * Baggage selection sub-document
 */
const baggageSelectionSchema = new mongoose.Schema(
  {
    checkinKg: { type: Number, default: 15 },
    cabinKg: { type: Number, default: 7 },
    extraCost: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Full Booking schema
 */
const bookingSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
    },

    // Client-provided booking ID (mirrors bookingRef; kept for API compatibility)
    bookingId: {
      type: String,
      index: true,
      sparse: true,
    },

    // References
    userId: {
      type: mongoose.Schema.Types.Mixed, // String for in-memory, ObjectId for MongoDB
      ref: "User",
    },
    flightId: { type: String, required: true },

    // Snapshot of flight data at time of booking (prices may change)
    flight: { type: Object, required: true },

    // Booking details
    travelDate: { type: String, required: true }, // YYYY-MM-DD
    cabinClass: { type: String, default: "Economy" },

    // Passengers
    passengers: { type: [passengerSchema], required: true },
    passengerCount: { type: Number, required: true },

    // Contact info
    contact: {
      email: { type: String, required: true },
      phone: { type: String },
      name: { type: String },
    },

    // Seat selection
    seat: { type: String }, // e.g. "5A" — first passenger primary seat
    seats: { type: [String], default: [] }, // all passenger seats

    // Baggage
    baggage: { type: baggageSelectionSchema },

    // Server-computed fare (never trust client)
    fareBreakdown: { type: fareBreakdownSchema, required: true },

    // Status
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "failed"],
      default: "pending",
    },

    // Payment
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "card" },
    paymentIntentId: { type: String }, // Stripe payment intent
    transactionId: { type: String },
    paidAt: { type: Date },

    // Idempotency: prevent duplicate submissions
    idempotencyKey: { type: String, unique: true, sparse: true },

    // Cancellation & Refund Tracking
    cancellation: {
      requestedAt: { type: Date },
      reason: { type: String, default: "" },
      cancellationFee: { type: Number, default: 0 },
      refundAmount: { type: Number, default: 0 },
      refundStatus: {
        type: String,
        enum: ["none", "pending", "processed", "completed", "rejected"],
        default: "none",
      },
      refundTransactionId: { type: String, default: "" },
      refundProcessedAt: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Indexes for efficient queries
// NOTE: bookingRef already has unique:true above which creates its own index — no need to re-declare it here
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ flightId: 1 });
bookingSchema.index({ "contact.email": 1 });
bookingSchema.index({ paymentIntentId: 1 }, { sparse: true });

export const Booking = mongoose.model("Booking", bookingSchema);
