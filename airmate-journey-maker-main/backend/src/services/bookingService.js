import { Booking } from "../models/Booking.js";
import { Payment } from "../models/Payment.js";
import { Passenger } from "../models/Passenger.js";
import { Cancellation } from "../models/Cancellation.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { inMemorySupportTickets } from "./userService.js";
import { isDBConnected } from "../config/db.js";
import { logger } from "../utils/logger.js";
import { getFlightById } from "./flightService.js";
import { reserveSeatAtomic, releaseSeatAtomic } from "./seatService.js";
import { sendBookingConfirmationEmail, sendCancellationRefundEmail } from "./emailService.js";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// In-memory booking fallback when DB not connected
const inMemoryBookings = [];

const EXTRA_CHECKIN_RATE = 500; // ₹ per kg over allowance
const EXTRA_CABIN_RATE = 750;   // ₹ per kg over allowance
const SEAT_FEE = 350;           // ₹ per seat selected
const TAX_RATE = 0.09;          // 9% tax on subtotal

/**
 * Generate a unique booking reference: AM + 6 alphanumeric chars
 */
function generateBookingRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "AM";
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

/**
 * Server-side fare calculation — never trust prices from the browser.
 * 
 * @param {Object} flight  - The canonical flight document from DB/memory
 * @param {string} cabinClass
 * @param {number} passengerCount
 * @param {boolean} hasSeat  - Whether a seat was selected (adds SEAT_FEE)
 * @param {Object} baggage   - { checkinKg, cabinKg }
 * @returns {Object} fareBreakdown
 */
export function computeFare(flight, cabinClass, passengerCount, hasSeat, baggage) {
  // 1. Determine cabin multiplier
  const classes = flight.cabinClasses && flight.cabinClasses.length
    ? flight.cabinClasses
    : [
        { className: "Economy", priceMultiplier: 1 },
        { className: "Premium Economy", priceMultiplier: 1.45 },
        { className: "Business", priceMultiplier: 2.2 },
      ];
  const classObj = classes.find((c) => c.className === cabinClass) || classes[0];
  const multiplier = classObj.priceMultiplier || 1;

  // 2. Base fare per passenger
  const baseFarePerPax = Math.round(flight.price * multiplier);
  const baseFare = baseFarePerPax * passengerCount;

  // 3. Fuel surcharge (16% of base)
  const fuelSurcharge = Math.round(baseFare * 0.16);

  // 4. Airport taxes (8% of base)
  const airportTaxes = Math.round(baseFare * 0.08);

  // 5. User development fee
  const userDevelopmentFee = Math.round(baseFare * 0.04);

  // 6. Seat fee (per passenger if selected)
  const seatFee = hasSeat ? SEAT_FEE * passengerCount : 0;

  // 7. Baggage fee
  let baggageFee = 0;
  if (baggage) {
    const allowedCheckin = classObj.baggageKg || flight.checkinKg || 15;
    const allowedCabin = classObj.cabinKg || flight.cabinKg || 7;
    const overCheckin = Math.max(0, (baggage.checkinKg || 0) - allowedCheckin);
    const overCabin = Math.max(0, (baggage.cabinKg || 0) - allowedCabin);
    baggageFee = (overCheckin * EXTRA_CHECKIN_RATE + overCabin * EXTRA_CABIN_RATE) * passengerCount;
  }

  // 8. Subtotal before tax
  const subtotal = baseFare + fuelSurcharge + airportTaxes + userDevelopmentFee + seatFee + baggageFee;

  // 9. GST / service tax
  const tax = Math.round(subtotal * TAX_RATE);

  const total = subtotal + tax;

  return {
    baseFare,
    fuelSurcharge,
    airportTaxes,
    userDevelopmentFee,
    seatFee,
    baggageFee,
    tax,
    total,
  };
}

/**
 * Create a booking with server-computed fares.
 * Validates passenger details, fetches flight from DB, computes fare, persists.
 */
export async function createBookingService({
  bookingId,
  userId,
  userEmail,
  userName,
  flightId,
  flight: flightInput,
  cabinClass,
  travelDate,
  passengers,
  seat,
  seats,
  baggage,
  contact,
  idempotencyKey,
}) {
  const effFlightId = flightId || flightInput?.id || "f-1";
  const flight = (await getFlightById(effFlightId)) || flightInput || {
    id: effFlightId,
    flightNumber: "AM-204",
    price: 3000,
  };

  const effTravelDate = travelDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const effPassengers = (passengers && passengers.length > 0)
    ? passengers
    : [{ firstName: userName?.split(" ")[0] || "Passenger", lastName: userName?.split(" ")[1] || "One", type: "adult" }];
  const effContact = contact || { email: userEmail || "passenger@airmate.com", name: userName || "Passenger One" };

  for (const p of effPassengers) {
    if (!p.firstName || !p.firstName.trim()) throw new Error("Passenger first name is required");
    if (!p.lastName || !p.lastName.trim()) throw new Error("Passenger last name is required");
  }

  // --- Idempotency check ---
  if (idempotencyKey && isDBConnected()) {
    const existing = await Booking.findOne({ idempotencyKey });
    if (existing) {
      logger.info(`Returning existing booking for idempotency key: ${idempotencyKey}`);
      return existing.toObject();
    }
  }

  const passengerCount = effPassengers.length;

  // --- Server-side fare computation ---
  const fareBreakdown = computeFare(
    flight,
    cabinClass || "Economy",
    passengerCount,
    !!seat,
    baggage
  );

  // --- Generate booking reference ---
  const bookingRef = bookingId || generateBookingRef();
  const transactionId = "TXN" + Date.now().toString().slice(-10);

  const baggageData = baggage
    ? {
        checkinKg: baggage.checkinKg || 15,
        cabinKg: baggage.cabinKg || 7,
        extraCost: baggage.cost || baggage.extraCost || 0,
      }
    : { checkinKg: 15, cabinKg: 7, extraCost: 0 };

  // --- Atomic seat reservation to prevent double-booking ---
  if (seat) {
    await reserveSeatAtomic({
      flightId: flight.id || effFlightId,
      seatNumber: seat,
      bookingRef,
      userId,
    });
  }

  const bookingDoc = {
    bookingRef,
    bookingId: bookingRef,
    userId: userId || null,
    flightId: flight.id || effFlightId,
    flight,
    travelDate: effTravelDate,
    cabinClass: cabinClass || "Economy",
    passengers: effPassengers,
    passengerCount,
    contact: effContact,
    seat: seat || (seats && seats[0]) || null,
    seats: seats || (seat ? [seat] : []),
    baggage: baggageData,
    fareBreakdown,
    totalAmount: fareBreakdown.total,
    bookingStatus: "pending",
    paymentStatus: "pending",
    paymentMethod: "card",
    transactionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (idempotencyKey) {
    bookingDoc.idempotencyKey = idempotencyKey;
  }

  if (isDBConnected()) {
    const created = await Booking.create(bookingDoc);
    logger.info(`Booking created in DB: ${bookingRef}`);

    // Persist Payment record
    try {
      await Payment.create({
        paymentId: "PAY_" + transactionId,
        bookingRef,
        userId: userId || null,
        amount: fareBreakdown.total,
        currency: "INR",
        paymentMethod: "card",
        status: "pending",
        transactionId,
      });
    } catch (payErr) {
      logger.warn(`Could not persist payment record: ${payErr.message}`);
    }

    // Persist Passenger records
    try {
      if (Array.isArray(effPassengers) && effPassengers.length > 0) {
        const passengerDocs = effPassengers.map((p, idx) => ({
          userId: userId || null,
          bookingRef,
          type: p.type || "adult",
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender || "male",
          dateOfBirth: p.dateOfBirth,
          nationality: p.nationality || "Indian",
          passportNumber: p.passportNumber || "",
          passportExpiry: p.passportExpiry || "",
          seatNumber: (seats && seats[idx]) || (idx === 0 ? seat : "") || "",
        }));
        await Passenger.insertMany(passengerDocs);
      }
    } catch (paxErr) {
      logger.warn(`Could not persist passenger records: ${paxErr.message}`);
    }

    sendBookingConfirmationEmail(created.toObject(), { id: userId, email: effContact.email }).catch((err) => {
      logger.warn(`Could not send confirmation email: ${err.message}`);
    });
    return created.toObject();
  } else {
    bookingDoc._id = "b_" + Date.now();
    bookingDoc.id = bookingDoc._id;
    inMemoryBookings.unshift(bookingDoc);
    logger.info(`Booking created (in-memory): ${bookingRef}`);
    sendBookingConfirmationEmail(bookingDoc, { id: userId, email: effContact.email }).catch((err) => {
      logger.warn(`Could not send confirmation email: ${err.message}`);
    });
    return bookingDoc;
  }
}

/**
 * Confirm payment and mark booking as paid.
 * Called after successful Stripe payment.
 */
export async function confirmPaymentService({ bookingRef, paymentIntentId, paymentMethod }) {
  const update = {
    paymentStatus: "paid",
    bookingStatus: "confirmed",
    paymentIntentId: paymentIntentId || null,
    paymentMethod: paymentMethod || "card",
    paidAt: new Date(),
  };

  if (isDBConnected()) {
    const booking = await Booking.findOneAndUpdate(
      { bookingRef, paymentStatus: "pending" },
      { $set: update },
      { new: true }
    );
    if (!booking) {
      // Check if already confirmed (idempotent)
      const existing = await Booking.findOne({ bookingRef });
      if (existing && existing.paymentStatus === "paid") return existing.toObject();
      throw new Error("Booking not found or already processed");
    }
    logger.info(`Payment confirmed for booking ${bookingRef}`);
    try {
      await Payment.findOneAndUpdate(
        { bookingRef },
        {
          $set: {
            status: "paid",
            stripePaymentIntentId: paymentIntentId || "",
            transactionId: booking.transactionId,
            paidAt: update.paidAt,
          },
        }
      );
    } catch (error) {
      logger.warn(`Could not update payment record for ${bookingRef}: ${error.message}`);
    }
    return booking.toObject();
  } else {
    const booking = inMemoryBookings.find((b) => b.bookingRef === bookingRef);
    if (!booking) throw new Error("Booking not found");
    Object.assign(booking, update, { updatedAt: new Date().toISOString() });
    logger.info(`Payment confirmed (in-memory): ${bookingRef}`);
    return booking;
  }
}

/**
 * Create a Stripe PaymentIntent for the booking amount.
 */
export async function createPaymentIntentService({ bookingRef, amount }) {
  if (!stripe) {
    // No Stripe key configured: return a mock intent for demo mode
    return {
      clientSecret: `demo_secret_${bookingRef}_${Date.now()}`,
      paymentIntentId: `demo_pi_${Date.now()}`,
      amount,
      currency: "inr",
      mode: "demo",
    };
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe uses paise
    currency: "inr",
    metadata: { bookingRef },
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount,
    currency: "inr",
    mode: "stripe",
  };
}

/**
 * Get all bookings (admin)
 */
export async function getAllBookingsService() {
  if (isDBConnected()) {
    return await Booking.find().sort({ createdAt: -1 }).lean();
  }
  return inMemoryBookings;
}

/**
 * Get bookings for a specific user
 */
export async function getUserBookingsService(userId, email) {
  if (isDBConnected()) {
    return await Booking.find({
      $or: [{ userId }, { "contact.email": email }],
    })
      .sort({ createdAt: -1 })
      .lean();
  }
  return inMemoryBookings.filter(
    (b) => b.userId === userId || (b.contact && b.contact.email === email)
  );
}

/**
 * Get booking by booking reference
 */
export async function getBookingByRefService(bookingRef) {
  if (isDBConnected()) {
    return await Booking.findOne({ bookingRef }).lean();
  }
  return inMemoryBookings.find((b) => b.bookingRef === bookingRef) || null;
}

/**
 * Get booking by ID (MongoDB _id or in-memory _id)
 */
export async function getBookingByIdService(id) {
  if (isDBConnected()) {
    const conditions = [{ bookingRef: id }, { bookingId: id }];
    if (id.match(/^[0-9a-fA-F]{24}$/)) conditions.push({ _id: id });
    return await Booking.findOne({ $or: conditions }).lean();
  }
  return inMemoryBookings.find((b) => b.bookingRef === id || b.bookingId === id || b._id === id || b.id === id) || null;
}

/**
 * Seed initial sample bookings for in-memory resilience if empty
 */
function seedInitialBookings() {
  if (inMemoryBookings.length > 0) return;
  const now = Date.now();
  const dayMs = 86400000;

  const samples = [
    {
      bookingRef: "AM8X9P2Q",
      userId: "cust_demo_1",
      flightId: "f-3",
      flight: {
        flightNumber: "AI-805",
        airline: "Air India",
        from: "Delhi",
        fromCode: "DEL",
        to: "Mumbai",
        toCode: "BOM",
        departure: "09:00",
        arrival: "11:15",
        price: 5200,
      },
      travelDate: new Date(now + 3 * dayMs).toISOString().split("T")[0],
      cabinClass: "Economy",
      passengers: [
        {
          type: "adult",
          firstName: "Rahul",
          lastName: "Sharma",
          dateOfBirth: "1988-06-15",
          gender: "male",
          nationality: "Indian",
        },
        {
          type: "adult",
          firstName: "Priya",
          lastName: "Sharma",
          dateOfBirth: "1991-09-22",
          gender: "female",
          nationality: "Indian",
        },
      ],
      passengerCount: 2,
      contact: { email: "rahul.sharma@example.com", phone: "+91 98765 43210", name: "Rahul Sharma" },
      seat: "12A",
      seats: ["12A", "12B"],
      baggage: { checkinKg: 15, cabinKg: 7, extraCost: 0 },
      fareBreakdown: {
        baseFare: 10400,
        fuelSurcharge: 1664,
        airportTaxes: 832,
        userDevelopmentFee: 416,
        seatFee: 700,
        baggageFee: 0,
        tax: 1261,
        total: 15273,
      },
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "card",
      paymentIntentId: "pi_demo_1001",
      transactionId: "txn_demo_1001",
      paidAt: new Date(now - 2 * dayMs),
      createdAt: new Date(now - 2 * dayMs).toISOString(),
      updatedAt: new Date(now - 2 * dayMs).toISOString(),
    },
    {
      bookingRef: "AM3K7L9V",
      userId: "cust_demo_2",
      flightId: "f-4",
      flight: {
        flightNumber: "6E-2412",
        airline: "IndiGo",
        from: "Bengaluru",
        fromCode: "BLR",
        to: "Delhi",
        toCode: "DEL",
        departure: "14:30",
        arrival: "17:15",
        price: 5600,
      },
      travelDate: new Date(now + 5 * dayMs).toISOString().split("T")[0],
      cabinClass: "Premium Economy",
      passengers: [
        {
          type: "adult",
          firstName: "Aditi",
          lastName: "Verma",
          dateOfBirth: "1994-03-12",
          gender: "female",
          nationality: "Indian",
        },
      ],
      passengerCount: 1,
      contact: { email: "aditi.verma@example.com", phone: "+91 99887 76655", name: "Aditi Verma" },
      seat: "4C",
      seats: ["4C"],
      baggage: { checkinKg: 20, cabinKg: 10, extraCost: 0 },
      fareBreakdown: {
        baseFare: 8120,
        fuelSurcharge: 1299,
        airportTaxes: 650,
        userDevelopmentFee: 325,
        seatFee: 350,
        baggageFee: 0,
        tax: 967,
        total: 11711,
      },
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "card",
      paymentIntentId: "pi_demo_1002",
      transactionId: "txn_demo_1002",
      paidAt: new Date(now - 1 * dayMs),
      createdAt: new Date(now - 1 * dayMs).toISOString(),
      updatedAt: new Date(now - 1 * dayMs).toISOString(),
    },
    {
      bookingRef: "AM9W2T4N",
      userId: "cust_demo_3",
      flightId: "f-5",
      flight: {
        flightNumber: "UK-945",
        airline: "Vistara",
        from: "Mumbai",
        fromCode: "BOM",
        to: "Goa",
        toCode: "GOI",
        departure: "11:20",
        arrival: "12:35",
        price: 4300,
      },
      travelDate: new Date(now + 8 * dayMs).toISOString().split("T")[0],
      cabinClass: "Economy",
      passengers: [
        {
          type: "adult",
          firstName: "Vikram",
          lastName: "Mehta",
          dateOfBirth: "1985-11-04",
          gender: "male",
          nationality: "Indian",
        },
      ],
      passengerCount: 1,
      contact: { email: "vikram.mehta@example.com", phone: "+91 91234 56789", name: "Vikram Mehta" },
      seat: "7F",
      seats: ["7F"],
      baggage: { checkinKg: 15, cabinKg: 7, extraCost: 0 },
      fareBreakdown: {
        baseFare: 4300,
        fuelSurcharge: 688,
        airportTaxes: 344,
        userDevelopmentFee: 172,
        seatFee: 350,
        baggageFee: 0,
        tax: 527,
        total: 6381,
      },
      bookingStatus: "cancelled",
      paymentStatus: "refunded",
      paymentMethod: "card",
      paymentIntentId: "pi_demo_1003",
      transactionId: "txn_demo_1003",
      paidAt: new Date(now - 5 * dayMs),
      createdAt: new Date(now - 6 * dayMs).toISOString(),
      updatedAt: new Date(now - 4 * dayMs).toISOString(),
    },
    {
      bookingRef: "AM5P6Y1R",
      userId: "cust_demo_4",
      flightId: "f-1",
      flight: {
        flightNumber: "AM-204",
        airline: "AirMate Connect",
        from: "Vijayawada",
        fromCode: "VGA",
        to: "Hyderabad",
        toCode: "HYD",
        departure: "07:15",
        arrival: "08:10",
        price: 3200,
      },
      travelDate: new Date(now + 4 * dayMs).toISOString().split("T")[0],
      cabinClass: "Economy",
      passengers: [
        {
          type: "adult",
          firstName: "Kiran",
          lastName: "Reddy",
          dateOfBirth: "1996-07-19",
          gender: "male",
          nationality: "Indian",
        },
      ],
      passengerCount: 1,
      contact: { email: "kiran.reddy@example.com", phone: "+91 98480 12345", name: "Kiran Reddy" },
      seat: "8D",
      seats: ["8D"],
      baggage: { checkinKg: 15, cabinKg: 7, extraCost: 0 },
      fareBreakdown: {
        baseFare: 3200,
        fuelSurcharge: 512,
        airportTaxes: 256,
        userDevelopmentFee: 128,
        seatFee: 350,
        baggageFee: 0,
        tax: 399,
        total: 4845,
      },
      bookingStatus: "pending",
      paymentStatus: "pending",
      paymentMethod: "card",
      createdAt: new Date(now - 3 * 3600000).toISOString(),
      updatedAt: new Date(now - 3 * 3600000).toISOString(),
    },
  ];

  inMemoryBookings.push(...samples);
}

// Seed on startup
seedInitialBookings();

/**
 * Search & paginate bookings for admin portal
 */
export async function adminSearchBookingsService({
  query = "",
  bookingStatus = "all",
  paymentStatus = "all",
  startDate = "",
  endDate = "",
  page = 1,
  limit = 20,
} = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  if (isDBConnected()) {
    const filter = {};
    if (bookingStatus && bookingStatus !== "all") filter.bookingStatus = bookingStatus;
    if (paymentStatus && paymentStatus !== "all") filter.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    if (query) {
      filter.$or = [
        { bookingRef: { $regex: query, $options: "i" } },
        { "contact.email": { $regex: query, $options: "i" } },
        { "contact.name": { $regex: query, $options: "i" } },
        { "flight.flightNumber": { $regex: query, $options: "i" } },
        { "passengers.firstName": { $regex: query, $options: "i" } },
        { "passengers.lastName": { $regex: query, $options: "i" } },
      ];
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return {
      bookings,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  } else {
    let list = [...inMemoryBookings];
    if (bookingStatus && bookingStatus !== "all") {
      list = list.filter((b) => b.bookingStatus === bookingStatus);
    }
    if (paymentStatus && paymentStatus !== "all") {
      list = list.filter((b) => b.paymentStatus === paymentStatus);
    }
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      list = list.filter((b) => new Date(b.createdAt).getTime() >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate + "T23:59:59.999Z").getTime();
      list = list.filter((b) => new Date(b.createdAt).getTime() <= endMs);
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((b) => {
        const refMatch = b.bookingRef?.toLowerCase().includes(q);
        const emailMatch = b.contact?.email?.toLowerCase().includes(q);
        const nameMatch = b.contact?.name?.toLowerCase().includes(q);
        const flightMatch = b.flight?.flightNumber?.toLowerCase().includes(q);
        const paxMatch = b.passengers?.some(
          (p) => p.firstName?.toLowerCase().includes(q) || p.lastName?.toLowerCase().includes(q)
        );
        return refMatch || emailMatch || nameMatch || flightMatch || paxMatch;
      });
    }

    const total = list.length;
    const paginated = list.slice(skip, skip + limitNum);

    return {
      bookings: paginated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  }
}

/**
 * Admin update booking status (confirmed, cancelled, failed)
 */
export async function adminUpdateBookingStatusService(bookingRef, { bookingStatus, reason = "" }) {
  if (!["confirmed", "cancelled", "failed", "pending"].includes(bookingStatus)) {
    throw new Error("Invalid booking status");
  }

  if (isDBConnected()) {
    const booking = await Booking.findOne({ bookingRef });
    if (!booking) throw new Error("Booking not found");
    booking.bookingStatus = bookingStatus;
    await booking.save();
    return booking.toObject();
  } else {
    const booking = inMemoryBookings.find((b) => b.bookingRef === bookingRef);
    if (!booking) throw new Error("Booking not found");
    booking.bookingStatus = bookingStatus;
    booking.updatedAt = new Date().toISOString();
    return booking;
  }
}

/**
 * Admin refund a booking (sets paymentStatus: refunded, bookingStatus: cancelled)
 */
export async function adminRefundBookingService(bookingRef, { reason = "Admin requested refund", refundAmount } = {}) {
  const refundTransactionId = "REF_" + Math.random().toString(36).substring(2, 10).toUpperCase();

  if (isDBConnected()) {
    const booking = await Booking.findOne({ bookingRef });
    if (!booking) throw new Error("Booking not found");
    if (booking.paymentStatus === "refunded") {
      throw new Error("Booking has already been refunded");
    }

    const calculatedRefund = refundAmount || booking.cancellation?.refundAmount || booking.fareBreakdown?.total || 0;

    booking.paymentStatus = "refunded";
    booking.bookingStatus = "cancelled";
    if (!booking.cancellation) {
      booking.cancellation = {};
    }
    booking.cancellation.refundStatus = "processed";
    booking.cancellation.adminApproved = true;
    booking.cancellation.refundProcessedAt = new Date();
    booking.cancellation.refundTransactionId = refundTransactionId;
    booking.cancellation.refundAmount = calculatedRefund;

    await booking.save();

    // Update Cancellation collection record if present
    try {
      await Cancellation.findOneAndUpdate(
        { bookingRef },
        {
          status: "approved",
          refundStatus: "processed",
          refundTransactionId,
          refundProcessedAt: new Date(),
          adminNotes: reason || "Admin approved refund",
        }
      );
    } catch (canErr) {
      logger.warn(`Could not update cancellation record: ${canErr.message}`);
    }

    // Resolve any associated Support Ticket for this cancellation
    try {
      const ticket = await SupportTicket.findOne({ bookingRef, category: "booking_cancellation" });
      if (ticket) {
        ticket.messages.push({
          sender: "support",
          senderName: "Operations Administrator",
          message: `Your cancellation has been reviewed and APPROVED by the Administrator. Refund of ₹${calculatedRefund.toLocaleString("en-IN")} has been credited. Transaction ID: ${refundTransactionId}.`,
          timestamp: new Date(),
        });
        ticket.status = "resolved";
        ticket.updatedAt = new Date();
        await ticket.save();
      }
    } catch (tickErr) {
      logger.warn(`Could not update support ticket on admin refund: ${tickErr.message}`);
    }

    // Send confirmation email
    sendCancellationRefundEmail(booking.toObject(), { refundAmount: calculatedRefund, reason }).catch((err) => {
      logger.warn(`Could not dispatch cancellation refund email: ${err.message}`);
    });

    return booking.toObject();
  } else {
    const booking = inMemoryBookings.find((b) => b.bookingRef === bookingRef);
    if (!booking) throw new Error("Booking not found");
    if (booking.paymentStatus === "refunded") {
      throw new Error("Booking has already been refunded");
    }

    const calculatedRefund = refundAmount || booking.cancellation?.refundAmount || booking.fareBreakdown?.total || 0;

    booking.paymentStatus = "refunded";
    booking.bookingStatus = "cancelled";
    if (!booking.cancellation) {
      booking.cancellation = {};
    }
    booking.cancellation.refundStatus = "processed";
    booking.cancellation.adminApproved = true;
    booking.cancellation.refundProcessedAt = new Date();
    booking.cancellation.refundTransactionId = refundTransactionId;
    booking.cancellation.refundAmount = calculatedRefund;
    booking.updatedAt = new Date().toISOString();

    const memTicket = inMemorySupportTickets.find((t) => t.bookingRef === bookingRef && t.category === "booking_cancellation");
    if (memTicket) {
      memTicket.messages.push({
        sender: "support",
        senderName: "Operations Administrator",
        message: `Your cancellation has been reviewed and APPROVED by the Administrator. Refund of ₹${calculatedRefund.toLocaleString("en-IN")} has been credited. Transaction ID: ${refundTransactionId}.`,
        timestamp: new Date(),
      });
      memTicket.status = "resolved";
      memTicket.updatedAt = new Date().toISOString();
    }

    return booking;
  }
}

/**
 * Compute precise admin metrics from MongoDB or resilient in-memory records.
 * Excludes failed, pending, and refunded payments from collected revenue.
 */
export async function getPreciseAdminMetricsService(flightsList = [], usersList = []) {
  let allBookings = [];
  if (isDBConnected()) {
    allBookings = await Booking.find().lean();
  } else {
    allBookings = inMemoryBookings;
  }

  const flightCount = flightsList.length;
  const registeredUsers = usersList.length;

  // 1. Confirmed bookings count
  const confirmedBookingsList = allBookings.filter((b) => b.bookingStatus === "confirmed");
  const confirmedBookings = confirmedBookingsList.length;

  // 2. Total passengers across confirmed bookings
  const passengersFromBookings = confirmedBookingsList.reduce(
    (sum, b) => sum + (b.passengerCount || (b.passengers ? b.passengers.length : 1)),
    0
  );
  const seatsBookedOnFlights = flightsList.reduce((sum, f) => sum + (f.seatsBooked || 0), 0);
  const totalPassengers = passengersFromBookings > 0 ? passengersFromBookings : seatsBookedOnFlights;

  // 3. Collected Revenue: strictly paymentStatus === 'paid'
  // Excludes 'failed', 'pending', and 'refunded'
  const paidBookings = allBookings.filter((b) => b.paymentStatus === "paid");
  const collectedRevenue = paidBookings.reduce(
    (sum, b) => sum + (b.fareBreakdown?.total || b.totalAmount || 0),
    0
  );

  // 4. Pending payments
  const pendingBookings = allBookings.filter((b) => b.paymentStatus === "pending");
  const pendingPayments = pendingBookings.length;
  const pendingAmount = pendingBookings.reduce(
    (sum, b) => sum + (b.fareBreakdown?.total || b.totalAmount || 0),
    0
  );

  // 5. Cancellations: bookingStatus === 'cancelled'
  const cancellations = allBookings.filter((b) => b.bookingStatus === "cancelled").length;

  // 6. Refunds: paymentStatus === 'refunded'
  const refundedBookings = allBookings.filter((b) => b.paymentStatus === "refunded");
  const refunds = refundedBookings.length;
  const refundedAmount = refundedBookings.reduce(
    (sum, b) => sum + (b.fareBreakdown?.total || b.totalAmount || 0),
    0
  );

  // Metric definitions explicitly declared
  const metricDefinitions = {
    flightCount: "Total scheduled flights currently in the active flight catalog",
    confirmedBookings: "Total bookings with confirmed status across all cabin classes",
    registeredUsers: "Total registered passenger and administrator accounts in system",
    totalPassengers: "Total passengers registered on confirmed flight itineraries",
    collectedRevenue: "Gross settled revenue from successfully paid bookings. Excludes pending, failed, and refunded amounts.",
    pendingPayments: "Bookings created but awaiting customer payment confirmation or gateway settlement",
    cancellations: "Bookings cancelled prior to departure either by customer or flight operation control",
    refunds: "Bookings where payments have been reversed or credited back to original payment source",
  };

  return {
    metrics: {
      flightCount,
      totalFlights: flightCount,
      confirmedBookings,
      totalBookings: confirmedBookings,
      registeredUsers,
      totalPassengers,
      collectedRevenue,
      totalRevenue: collectedRevenue,
      pendingPayments,
      pendingAmount,
      cancellations,
      cancelledFlights: cancellations,
      delayedFlights: flightsList.filter((f) => f.status === "Delayed").length,
      refunds,
      refundedAmount,
    },
    metricDefinitions,
    databaseStatus: isDBConnected() ? "connected" : "in-memory-resilient",
  };
}

/**
 * Calculate analytics for revenue, bookings, popular routes, occupancy, and airline performance
 */
export async function getAdminAnalyticsService(flightsList = []) {
  let allBookings = [];
  if (isDBConnected()) {
    allBookings = await Booking.find().lean();
  } else {
    allBookings = inMemoryBookings;
  }

  // Monthly Revenue (from paid bookings)
  const monthlyRevenueMap = {};
  // Initialize last 6 months
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    monthlyRevenueMap[key] = 0;
  }

  for (const b of allBookings) {
    if (b.paymentStatus === "paid" && b.createdAt) {
      const d = new Date(b.createdAt);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (monthlyRevenueMap[key] !== undefined) {
        monthlyRevenueMap[key] += b.fareBreakdown?.total || 0;
      }
    }
  }

  const monthlyRevenue = Object.entries(monthlyRevenueMap).map(([month, revenue]) => ({
    month,
    revenue,
  }));

  // Booking Trends (last 7 days)
  const bookingTrendsMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().split("T")[0];
    bookingTrendsMap[key] = { date: key.slice(5), confirmed: 0, cancelled: 0, pending: 0 };
  }

  for (const b of allBookings) {
    if (b.createdAt) {
      const day = new Date(b.createdAt).toISOString().split("T")[0];
      if (bookingTrendsMap[day]) {
        if (b.bookingStatus === "confirmed") bookingTrendsMap[day].confirmed++;
        else if (b.bookingStatus === "cancelled") bookingTrendsMap[day].cancelled++;
        else if (b.bookingStatus === "pending") bookingTrendsMap[day].pending++;
      }
    }
  }

  const bookingTrends = Object.values(bookingTrendsMap);

  // Popular Routes (from bookings + flight schedules)
  const routesMap = {};
  for (const b of allBookings) {
    if (b.flight) {
      const key = `${b.flight.fromCode || b.flight.from} → ${b.flight.toCode || b.flight.to}`;
      if (!routesMap[key]) {
        routesMap[key] = {
          route: key,
          from: b.flight.from,
          to: b.flight.to,
          bookings: 0,
          passengers: 0,
          revenue: 0,
        };
      }
      routesMap[key].bookings += 1;
      routesMap[key].passengers += b.passengerCount || 1;
      if (b.paymentStatus === "paid") {
        routesMap[key].revenue += b.fareBreakdown?.total || 0;
      }
    }
  }

  // Also include flights if routes are sparse
  for (const f of flightsList) {
    const key = `${f.fromCode} → ${f.toCode}`;
    if (!routesMap[key]) {
      routesMap[key] = {
        route: key,
        from: f.from,
        to: f.to,
        bookings: 0,
        passengers: f.seatsBooked || 0,
        revenue: (f.seatsBooked || 0) * (f.price || 0),
      };
    }
  }

  const popularRoutes = Object.values(routesMap)
    .sort((a, b) => b.bookings - a.bookings || b.passengers - a.passengers)
    .slice(0, 6);

  // Flight Occupancy
  const flightOccupancy = flightsList.map((f) => {
    const total = f.seatsTotal || 180;
    const booked = f.seatsBooked || 0;
    const rate = Math.min(100, Math.round((booked / total) * 100));
    return {
      id: f.id,
      flightNumber: f.flightNumber,
      route: `${f.fromCode}-${f.toCode}`,
      airline: f.airline,
      seatsBooked: booked,
      seatsTotal: total,
      occupancyRate: rate,
      status: f.status || "On Time",
    };
  }).slice(0, 10);

  // Airline Performance
  const airlineMap = {};
  for (const f of flightsList) {
    const name = f.airline || "Other";
    if (!airlineMap[name]) {
      airlineMap[name] = {
        airline: name,
        flights: 0,
        seatsBooked: 0,
        revenue: 0,
        onTimeFlights: 0,
      };
    }
    airlineMap[name].flights += 1;
    airlineMap[name].seatsBooked += f.seatsBooked || 0;
    airlineMap[name].revenue += (f.seatsBooked || 0) * (f.price || 0);
    if (f.status === "On Time") airlineMap[name].onTimeFlights += 1;
  }

  const airlinePerformance = Object.values(airlineMap).map((a) => ({
    ...a,
    onTimeRate: a.flights > 0 ? Math.round((a.onTimeFlights / a.flights) * 100) : 100,
  }));

  return {
    monthlyRevenue,
    bookingTrends,
    popularRoutes,
    flightOccupancy,
    airlinePerformance,
    totalPersistedBookings: allBookings.length,
    isEmpty: allBookings.length === 0,
  };
}

/**
 * Customer cancel booking request with server-side validation and refund processing
 */
export async function customerCancelBookingService({ bookingRef, userId, userEmail, reason = "Customer requested cancellation" }) {
  let booking = null;
  if (isDBConnected()) {
    booking = await Booking.findOne({ bookingRef });
  } else {
    booking = inMemoryBookings.find((b) => b.bookingRef === bookingRef);
  }

  if (!booking) {
    throw new Error("Booking not found");
  }

  // Ownership verification
  const isOwner =
    (booking.userId && String(booking.userId) === String(userId)) ||
    (booking.contact && booking.contact.email?.toLowerCase() === userEmail?.toLowerCase());

  if (!isOwner && userId !== "admin") {
    throw new Error("Unauthorized to cancel this booking");
  }

  if (booking.bookingStatus === "cancelled") {
    throw new Error("Booking is already cancelled");
  }

  const total = booking.fareBreakdown?.total || 0;
  // If flight refundable, flat deduction is 600, else non-refundable retains basic fare
  const isRefundable = booking.flight?.refundable !== false;
  const cancellationFee = isRefundable ? 600 : Math.round(total * 0.4);
  const refundAmount = Math.max(0, total - cancellationFee);

  const cancellationData = {
    requestedAt: new Date(),
    reason: reason || "Customer requested cancellation",
    cancellationFee,
    refundAmount,
    refundStatus: "pending", // Pending admin approval before refund is credited
    refundTransactionId: "",
    refundProcessedAt: null,
    adminApproved: false,
  };

  booking.bookingStatus = "cancelled";
  // Crucial: paymentStatus is NOT "refunded" until approved by administrator
  booking.paymentStatus = "paid";
  booking.cancellation = cancellationData;

  const ticketId = "TKT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const ticketDoc = {
    ticketId,
    userId: booking.userId || userId,
    userEmail: booking.contact?.email || userEmail,
    userName: booking.contact?.name || "Customer",
    subject: `Cancellation & Refund Approval for PNR ${bookingRef}`,
    category: "booking_cancellation",
    bookingRef,
    priority: "high",
    status: "open",
    messages: [
      {
        sender: "customer",
        senderName: booking.contact?.name || "Customer",
        message: `I have cancelled my booking ${bookingRef}. Reason: "${reason}". Please review and approve the refund credit of ₹${refundAmount.toLocaleString("en-IN")}.`,
        timestamp: new Date(),
      },
    ],
  };

  if (isDBConnected()) {
    await booking.save();

    // Persist Cancellation record as pending admin approval
    try {
      await Cancellation.create({
        cancellationId: "CAN_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
        bookingRef,
        userId: booking.userId || userId,
        userEmail: booking.contact?.email || userEmail,
        reason: cancellationData.reason,
        status: "pending",
        cancellationFee,
        originalAmount: total,
        refundAmount,
        refundStatus: "pending",
        refundTransactionId: "",
        refundProcessedAt: null,
      });
    } catch (canErr) {
      logger.warn(`Could not persist cancellation record: ${canErr.message}`);
    }

    // Automatically create Support Ticket for Admin Support Inbox
    try {
      await SupportTicket.create(ticketDoc);
    } catch (ticketErr) {
      logger.warn(`Could not persist cancellation support ticket: ${ticketErr.message}`);
    }

    // Atomically release reserved seat(s)
    if (booking.seat || (booking.seats && booking.seats.length > 0)) {
      const seatsToRelease = booking.seats && booking.seats.length > 0 ? booking.seats : [booking.seat];
      for (const s of seatsToRelease) {
        await releaseSeatAtomic({ flightId: booking.flightId, seatNumber: s, bookingRef });
      }
    }

    booking = booking.toObject();
  } else {
    booking.updatedAt = new Date().toISOString();
    inMemorySupportTickets.unshift({
      ...ticketDoc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    booking,
    refund: cancellationData,
    message: `Cancellation request submitted for ${bookingRef}. Refund of ₹${refundAmount.toLocaleString("en-IN")} will be credited once approved by the administrator.`,
  };
}

/**
 * Get operational booking timeline events
 */
export async function getBookingTimelineService(bookingRef, userId, userEmail) {
  let booking = null;
  if (isDBConnected()) {
    booking = await Booking.findOne({ bookingRef }).lean();
  } else {
    booking = inMemoryBookings.find((b) => b.bookingRef === bookingRef);
  }
  if (!booking) throw new Error("Booking not found");

  const isOwner =
    (booking.userId && String(booking.userId) === String(userId)) ||
    (booking.contact && booking.contact.email?.toLowerCase() === userEmail?.toLowerCase());
  if (!isOwner && userId !== "admin") {
    throw new Error("Access denied: You can only view your own booking timeline");
  }

  const createdAt = booking.createdAt ? new Date(booking.createdAt) : new Date();
  const travelDate = booking.travelDate ? new Date(booking.travelDate) : new Date();
  const isCancelled = booking.bookingStatus === "cancelled";

  const timeline = [
    {
      step: 1,
      title: "Booking Requested & Confirmed",
      description: `PNR ${booking.bookingRef} issued for ${booking.passengerCount || 1} passenger(s)`,
      timestamp: createdAt.toISOString(),
      status: "completed",
    },
    {
      step: 2,
      title: "Fare Payment Settled",
      description: `Settled ₹${(booking.fareBreakdown?.total || 0).toLocaleString("en-IN")} via ${booking.paymentMethod || "card"}`,
      timestamp: booking.paidAt || createdAt.toISOString(),
      status: booking.paymentStatus === "paid" || booking.paymentStatus === "refunded" ? "completed" : "pending",
    },
    {
      step: 3,
      title: "Seats & Baggage Assigned",
      description: `Seat ${booking.seat || "Standard"} assigned · ${booking.baggage?.checkinKg || 15}kg check-in allowance registered`,
      timestamp: createdAt.toISOString(),
      status: booking.seat ? "completed" : "in_progress",
    },
    {
      step: 4,
      title: isCancelled ? (booking.paymentStatus === "refunded" || booking.cancellation?.refundStatus === "processed" ? "Cancellation Approved & Refunded" : "Cancellation Requested (Pending Admin Approval)") : "Web Check-in Ready",
      description: isCancelled
        ? (booking.paymentStatus === "refunded" || booking.cancellation?.refundStatus === "processed"
            ? `Cancellation approved. Refund of ₹${Number(booking.cancellation?.refundAmount || 0).toLocaleString("en-IN")} credited to original payment mode.`
            : `Cancellation requested. Refund credit of ₹${Number(booking.cancellation?.refundAmount || 0).toLocaleString("en-IN")} is awaiting administrator approval.`)
        : "Web check-in opens 48 hours before scheduled flight departure.",
      timestamp: isCancelled ? (booking.cancellation?.requestedAt || new Date()).toISOString() : travelDate.toISOString(),
      status: isCancelled ? "cancelled" : (new Date() >= new Date(travelDate.getTime() - 48 * 3600000) ? "current" : "upcoming"),
    },
    {
      step: 5,
      title: isCancelled ? "Flight Cancelled" : "Boarding & Departure",
      description: `${booking.flight?.airline || "AirMate"} ${booking.flight?.flightNumber || ""} from ${booking.flight?.fromCode || "DEL"} at ${booking.flight?.departure || "09:00"} (Gate ${booking.flight?.gate || "A1"})`,
      timestamp: travelDate.toISOString(),
      status: isCancelled ? "cancelled" : (new Date() > travelDate ? "completed" : "upcoming"),
    },
  ];

  return {
    bookingRef: booking.bookingRef,
    currentStage: isCancelled ? "Cancelled" : (new Date() > travelDate ? "Completed" : "Confirmed"),
    timeline,
  };
}

/**
 * Get refund tracking details
 */
export async function getBookingRefundStatusService(bookingRef, userId, userEmail) {
  let booking = null;
  if (isDBConnected()) {
    booking = await Booking.findOne({ bookingRef }).lean();
  } else {
    booking = inMemoryBookings.find((b) => b.bookingRef === bookingRef);
  }
  if (!booking) throw new Error("Booking not found");

  const isOwner =
    (booking.userId && String(booking.userId) === String(userId)) ||
    (booking.contact && booking.contact.email?.toLowerCase() === userEmail?.toLowerCase());
  if (!isOwner && userId !== "admin") {
    throw new Error("Access denied: You can only view your own refund status");
  }

  const cancellation = booking.cancellation || {};
  return {
    bookingRef: booking.bookingRef,
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    totalPaid: booking.fareBreakdown?.total || 0,
    cancellationFee: cancellation.cancellationFee || 0,
    refundAmount: cancellation.refundAmount || (booking.paymentStatus === "refunded" ? booking.fareBreakdown?.total : 0),
    refundStatus: cancellation.refundStatus || (booking.paymentStatus === "refunded" ? "processed" : "none"),
    refundTransactionId: cancellation.refundTransactionId || booking.transactionId || "N/A",
    requestedAt: cancellation.requestedAt || null,
    processedAt: cancellation.refundProcessedAt || null,
    estimatedDays: "3-5 business days",
  };
}

export { inMemoryBookings };

