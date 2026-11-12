import mongoose from "mongoose";

const flightSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true },
    airline: { type: String, required: true },
    flightNumber: { type: String, required: true },
    aircraft: { type: String, default: "Airbus A320neo" },

    from: { type: String, required: true },
    fromCode: { type: String, required: true },
    fromAirport: { type: String },
    fromTerminal: { type: String, default: "T1" },

    to: { type: String, required: true },
    toCode: { type: String, required: true },
    toAirport: { type: String },
    toTerminal: { type: String, default: "T2" },

    date: { type: String },                      // "YYYY-MM-DD"
    departure: { type: String, required: true }, // "HH:mm"
    arrival: { type: String, required: true },   // "HH:mm"
    duration: { type: String },                 // "2h 15m"
    durationMins: { type: Number, required: true },

    stops: { type: Number, default: 0 }, // 0 = Non-stop, 1 = 1 stop
    stopDetails: [
      {
        airport: String,
        code: String,
        durationMins: Number,
      },
    ],

    price: { type: Number, required: true }, // Base Economy fare
    cabinClass: { type: String, default: "Economy" },
    cabinClasses: [
      {
        className: { type: String, required: true },
        priceMultiplier: { type: Number, default: 1 },
        baggageKg: { type: Number, default: 15 },
        cabinKg: { type: Number, default: 7 },
        refundable: { type: Boolean, default: false },
        seatPitch: { type: String, default: "30-31 inch" },
      },
    ],

    fareBreakdown: {
      baseFare: { type: Number },
      fuelSurcharge: { type: Number },
      airportTaxes: { type: Number },
      userDevelopmentFee: { type: Number },
      total: { type: Number },
    },

    checkinKg: { type: Number, default: 15 },
    cabinKg: { type: Number, default: 7 },
    baggage: { type: String, default: "15 kg" },

    seatsTotal: { type: Number, default: 180 },
    seatsBooked: { type: Number, default: 120 },
    seatsAvailable: { type: Number, default: 60 },

    status: { type: String, default: "On Time" },
    gate: { type: String, default: "A1" },
    terminal: { type: String, default: "T1" },

    isDemoFlight: { type: Boolean, default: true },
    dataSourceLabel: {
      type: String,
      default: "Demo Flight Schedule (Simulated Airline Data)",
    },
  },
  { timestamps: true }
);

export const Flight = mongoose.model("Flight", flightSchema);
