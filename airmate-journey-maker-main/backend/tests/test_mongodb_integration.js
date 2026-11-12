import dns from "node:dns";
import dotenv from "dotenv";
dotenv.config();

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

import mongoose from "mongoose";
import { User, Flight, Booking, Seat, Payment, Cancellation } from "../src/models/index.js";

const BASE_URL = "http://127.0.0.1:5000";

let testCustToken = null;
let testCustUser = null;
let testCust2Token = null;
let adminToken = null;
let createdFlightId = null;
let createdBookingRef = null;

let passes = 0;
let fails = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passes++;
  } else {
    console.error(`  [FAIL] ${message}`);
    fails++;
  }
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log("========================================================");
  console.log("   AirMate MongoDB Atlas Full Integration Test Suite    ");
  console.log("========================================================");

  // 1. Verify MongoDB Atlas connectivity
  console.log("\n[Test 1] Verify MongoDB Atlas Connectivity & Health");
  const healthRes = await request("/api/health");
  assert(healthRes.status === 200, "Health check endpoint returns HTTP 200");
  assert(healthRes.data.database === "connected", "Database status reports 'connected'");
  assert(healthRes.data.databaseName === "airmate", "Active database is 'airmate'");

  const v1HealthRes = await request("/api/v1/health");
  assert(v1HealthRes.status === 200, "Versioned endpoint /api/v1/health returns HTTP 200");

  // Connect direct mongoose connection for verification
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "airmate" });

  // 2. Register a test customer and verify the persisted database record
  console.log("\n[Test 2] Customer Registration & Direct MongoDB Record Verification");
  const testEmail = `atlas_test_${Date.now()}@airmate.com`;
  const regRes = await request("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Atlas Integration Tester",
      email: testEmail,
      password: "SafePassword123!",
    }),
  });
  assert(regRes.status === 201, "Registration succeeds with HTTP 201");
  assert(!!regRes.data.token, "JWT token returned upon registration");
  testCustToken = regRes.data.token;
  testCustUser = regRes.data.user;

  // Direct DB lookup in MongoDB
  const dbUser = await User.findOne({ email: testEmail });
  assert(!!dbUser, "User document persisted in MongoDB Atlas");
  assert(dbUser.role === "customer", "Registered user role defaults to customer");
  assert(dbUser.passwordHash !== "SafePassword123!", "Password is securely bcrypt-hashed");

  // Register Customer 2 for isolation testing
  const test2Email = `atlas_other_${Date.now()}@airmate.com`;
  const reg2Res = await request("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Second Customer",
      email: test2Email,
      password: "SafePassword123!",
    }),
  });
  testCust2Token = reg2Res.data.token;

  // 3. Log in and verify protected routes
  console.log("\n[Test 3] Customer Login & Protected Routes");
  const loginRes = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: testEmail,
      password: "SafePassword123!",
    }),
  });
  assert(loginRes.status === 200, "Login succeeds with HTTP 200");
  assert(loginRes.data.user.email === testEmail, "Returned user profile matches email");

  const meRes = await request("/api/v1/auth/me", {
    headers: { Authorization: `Bearer ${testCustToken}` },
  });
  assert(meRes.status === 200, "GET /api/v1/auth/me succeeds with valid token");
  const returnedUser = meRes.data.user || meRes.data;
  assert(returnedUser.email === testEmail, "Profile matches authenticated user");

  // Admin login
  const adminLoginRes = await request("/api/v1/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || "admin@airmate.com",
      password: process.env.ADMIN_PASSWORD || "Admin@AirMate2026!",
    }),
  });
  assert(adminLoginRes.status === 200, "Admin login succeeds with HTTP 200");
  adminToken = adminLoginRes.data.token;

  // 4. Create and retrieve a flight through the API
  console.log("\n[Test 4] Admin Create & Retrieve Flight in MongoDB");
  const flightPayload = {
    flightNumber: "AM-999",
    airline: "AirMate Atlas",
    from: "Delhi",
    to: "Goa",
    fromCode: "DEL",
    toCode: "GOI",
    departure: "06:30",
    arrival: "09:00",
    price: 4999,
    durationMins: 150,
    seatsTotal: 180,
    aircraft: "Boeing 737 MAX",
  };
  const createFlightRes = await request("/api/v1/flights", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(flightPayload),
  });
  assert(createFlightRes.status === 201, "Flight created successfully with HTTP 201");
  createdFlightId = createFlightRes.data.id || createFlightRes.data._id;
  assert(!!createdFlightId, "Created flight has valid ID");

  const getFlightRes = await request(`/api/v1/flights/${createdFlightId}`);
  assert(getFlightRes.status === 200, "Retrieved flight by ID matches created flight");
  assert(getFlightRes.data.flightNumber === "AM-999", "Flight number is AM-999");

  // 5. Create a booking and retrieve it after refreshing
  console.log("\n[Test 5] Customer Booking Creation & Persistence");
  const bookingPayload = {
    flightId: createdFlightId,
    cabinClass: "Economy",
    travelDate: "2026-11-20",
    seat: "3A",
    passengers: [
      {
        firstName: "Atlas",
        lastName: "Explorer",
        type: "adult",
        gender: "male",
        nationality: "Indian",
      },
    ],
    contact: {
      name: "Atlas Explorer",
      email: testEmail,
      phone: "+91 9876543210",
    },
  };
  const createBookingRes = await request("/api/v1/bookings", {
    method: "POST",
    headers: { Authorization: `Bearer ${testCustToken}` },
    body: JSON.stringify(bookingPayload),
  });
  assert(createBookingRes.status === 201 || createBookingRes.status === 200, "Booking created with HTTP 200/201");
  createdBookingRef = createBookingRes.data.bookingRef;
  assert(!!createdBookingRef, `Booking reference issued: ${createdBookingRef}`);

  // Retrieve booking via API (simulate refresh)
  const getBookingRes = await request(`/api/v1/bookings/${createdBookingRef}`, {
    headers: { Authorization: `Bearer ${testCustToken}` },
  });
  assert(getBookingRes.status === 200, "Retrieved booking by reference successfully");
  assert(getBookingRes.data.seat === "3A", "Seat 3A correctly persisted");
  assert(getBookingRes.data.bookingStatus === "confirmed", "Booking status is confirmed");

  // Verify in MongoDB Booking, Seat, and Payment collections
  const dbBooking = await Booking.findOne({ bookingRef: createdBookingRef });
  assert(!!dbBooking, "Booking document exists in MongoDB Atlas");
  const dbPayment = await Payment.findOne({ bookingRef: createdBookingRef });
  assert(!!dbPayment, "Payment document recorded in MongoDB Atlas");
  const dbSeat = await Seat.findOne({ flightId: createdFlightId, seatNumber: "3A" });
  assert(dbSeat && dbSeat.isBooked, "Seat 3A is marked booked in MongoDB Seat inventory");

  // 6. Verify that a user cannot access another user's booking
  console.log("\n[Test 6] Multi-Tenant Data Isolation & Ownership Protection");
  const unauthorizedBookingRes = await request(`/api/v1/bookings/${createdBookingRef}`, {
    headers: { Authorization: `Bearer ${testCust2Token}` },
  });
  assert(
    unauthorizedBookingRes.status === 403,
    "Customer 2 is forbidden from accessing Customer 1's booking (HTTP 403)"
  );

  // 7. Verify that a customer cannot access admin APIs
  console.log("\n[Test 7] Role-Based Access Control (RBAC) Enforcement");
  const customerAdminAccessRes = await request("/api/v1/admin/dashboard", {
    headers: { Authorization: `Bearer ${testCustToken}` },
  });
  assert(
    customerAdminAccessRes.status === 403,
    "Customer cannot access GET /api/v1/admin/dashboard (HTTP 403)"
  );

  const customerFlightCreateRes = await request("/api/v1/flights", {
    method: "POST",
    headers: { Authorization: `Bearer ${testCustToken}` },
    body: JSON.stringify(flightPayload),
  });
  assert(
    customerFlightCreateRes.status === 403,
    "Customer cannot create flights (HTTP 403)"
  );

  // 8. Update a flight in the admin portal and verify persistence
  console.log("\n[Test 8] Admin Flight Update Persistence in MongoDB");
  const updateRes = await request(`/api/v1/flights/${createdFlightId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ price: 5499, status: "Delayed" }),
  });
  assert(updateRes.status === 200, "Flight updated via PATCH /api/v1/flights/:id");
  assert(updateRes.data.price === 5499, "Updated price is ₹5499");

  const flightQuery = mongoose.isValidObjectId(createdFlightId)
    ? { $or: [{ id: createdFlightId }, { _id: createdFlightId }] }
    : { id: createdFlightId };
  const verifyFlightInDb = await Flight.findOne(flightQuery);
  assert(verifyFlightInDb && verifyFlightInDb.price === 5499, "Updated flight price persists in MongoDB Atlas");
  assert(verifyFlightInDb && verifyFlightInDb.status === "Delayed", "Flight status persists as 'Delayed'");

  // 9. Verify dashboard statistics reflect database changes
  console.log("\n[Test 9] Admin Dashboard Aggregation Reflects MongoDB Records");
  const adminDashRes = await request("/api/v1/admin/dashboard", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminDashRes.status === 200, "Admin dashboard responds with HTTP 200");
  assert(adminDashRes.data.metrics.totalBookings >= 1, "Dashboard metrics count new booking");
  assert(adminDashRes.data.metrics.totalRevenue > 0, "Dashboard metrics compute collected revenue");

  const adminReportsRes = await request("/api/v1/admin/reports", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminReportsRes.status === 200, "Admin reports respond with HTTP 200");
  assert(Array.isArray(adminReportsRes.data.monthlyRevenue), "Monthly revenue series returned");

  // 10. Test seat double-booking prevention & invalid input handling
  console.log("\n[Test 10] Double-Booking Atomic Prevention & Validation");
  const doubleBookRes = await request("/api/v1/bookings", {
    method: "POST",
    headers: { Authorization: `Bearer ${testCust2Token}` },
    body: JSON.stringify({
      flightId: createdFlightId,
      cabinClass: "Economy",
      travelDate: "2026-11-20",
      seat: "3A", // Already booked by Customer 1!
      passengers: [{ firstName: "Attacker", lastName: "Two" }],
      contact: { name: "Attacker", email: test2Email },
    }),
  });
  assert(
    doubleBookRes.status === 409 || doubleBookRes.status === 400,
    "Seat double-booking attempt was blocked atomically"
  );

  // Cancellation and Seat Release test
  console.log("\n[Test 11] Customer Cancellation, Refund Tracking & Seat Release");
  const cancelRes = await request(`/api/v1/bookings/${createdBookingRef}/cancel`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${testCustToken}` },
    body: JSON.stringify({ reason: "Change of plans" }),
  });
  assert(cancelRes.status === 200, "Cancellation processed with HTTP 200");
  assert(cancelRes.data.booking.bookingStatus === "cancelled", "Booking status updated to 'cancelled'");

  const dbCancellation = await Cancellation.findOne({ bookingRef: createdBookingRef });
  assert(!!dbCancellation, "Cancellation record stored in MongoDB Cancellation collection");

  const releasedSeat = await Seat.findOne({ flightId: createdFlightId, seatNumber: "3A" });
  assert(releasedSeat && !releasedSeat.isBooked, "Seat 3A atomically released upon cancellation");

  // Summary
  console.log("\n========================================================");
  console.log(`   Integration Test Results: ${passes} Passed, ${fails} Failed`);
  console.log("========================================================");

  // Clean up test flight & users from MongoDB
  await Flight.deleteOne({ id: createdFlightId });
  await User.deleteMany({ email: { $in: [testEmail, test2Email] } });
  await Booking.deleteOne({ bookingRef: createdBookingRef });
  await Payment.deleteOne({ bookingRef: createdBookingRef });
  await Cancellation.deleteOne({ bookingRef: createdBookingRef });
  await Seat.deleteMany({ flightId: createdFlightId });

  await mongoose.connection.close();
  process.exit(fails > 0 ? 1 : 0);
}

runTests().catch(async (err) => {
  console.error("Test execution failed:", err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
