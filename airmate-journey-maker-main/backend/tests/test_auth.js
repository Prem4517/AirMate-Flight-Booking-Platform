async function runTests() {
  const base = "http://localhost:5000/api";
  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log("✅ PASS:", msg);
      passed++;
    } else {
      console.error("❌ FAIL:", msg);
      failed++;
    }
  }

  console.log("Starting AirMate Authentication & Authorization Test Suite...\n");

  // Test 1: Register customer
  const regEmail = `alice_${Date.now()}@example.com`;
  const regRes = await fetch(base + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Alice Walker",
      email: regEmail,
      password: "Password123!",
      role: "admin", // Malicious attempt to self-assign admin
    }),
  });
  const regData = await regRes.json();
  assert(regRes.status === 201, "Registration returns 201 Created");
  assert(regData.user.role === "customer", "Public registration forces role to 'customer' (ignores requested 'admin')");
  assert(typeof regData.token === "string" && regData.token.length > 20, "Registration returns valid JWT token");

  // Test 2: Customer login valid credentials
  const loginRes = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: regEmail, password: "Password123!" }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200, "Customer login returns 200 OK");
  assert(loginData.user.role === "customer", "User profile role is customer");
  const customerToken = loginData.token;

  // Test 3: Customer login with invalid password
  const badLoginRes = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: regEmail, password: "WrongPassword99!" }),
  });
  assert(badLoginRes.status === 401, "Customer login with invalid password returns 401 Unauthorized");

  // Test 4: Administrator login with trusted credentials
  const adminLoginRes = await fetch(base + "/auth/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@airmate.com", password: "Admin@AirMate2026!" }),
  });
  const adminData = await adminLoginRes.json();
  assert(adminLoginRes.status === 200, "Administrator login returns 200 OK");
  assert(adminData.user.role === "admin", "Admin role is strictly 'admin'");
  const adminToken = adminData.token;

  // Test 5: Customer attempting to log in via Admin login portal
  const custToAdminRes = await fetch(base + "/auth/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: regEmail, password: "Password123!" }),
  });
  assert(custToAdminRes.status === 403, "Customer credentials blocked at admin login endpoint (403 Forbidden)");

  // Test 6: Customer denied access to admin overview
  const custAdminOverview = await fetch(base + "/admin/overview", {
    headers: { Authorization: "Bearer " + customerToken },
  });
  assert(custAdminOverview.status === 403, "Customer blocked from /api/admin/overview (403 Forbidden)");

  // Test 7: Admin granted access to admin overview
  const adminOverview = await fetch(base + "/admin/overview", {
    headers: { Authorization: "Bearer " + adminToken },
  });
  const overviewData = await adminOverview.json();
  assert(adminOverview.status === 200, "Admin successfully accesses /api/admin/overview (200 OK)");
  assert(overviewData.metrics && overviewData.metrics.totalFlights > 0, "Admin overview returns flight and passenger metrics");

  // Test 8: Customer denied access to all bookings
  const custAllBookings = await fetch(base + "/bookings", {
    headers: { Authorization: "Bearer " + customerToken },
  });
  assert(custAllBookings.status === 403, "Customer blocked from reading all bookings (403 Forbidden)");

  // Test 9: Admin granted access to all bookings
  const adminAllBookings = await fetch(base + "/bookings", {
    headers: { Authorization: "Bearer " + adminToken },
  });
  assert(adminAllBookings.status === 200, "Admin can read all bookings (200 OK)");

  // Test 10: Create booking as customer A
  const bookingIdA = "AM_" + Date.now();
  const createBookingRes = await fetch(base + "/bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + customerToken,
    },
    body: JSON.stringify({
      bookingId: bookingIdA,
      flight: { id: "f-1", flightNumber: "AM-204", fromCode: "VGA", toCode: "HYD", price: 2850 },
    }),
  });
  const newBooking = await createBookingRes.json();
  assert(createBookingRes.status === 201, "Customer can create booking (201 Created)");
  assert(newBooking.userId === loginData.user.id, "Booking automatically binds to Customer user ID");
  assert(newBooking.paymentStatus === "pending", "New booking waits for payment confirmation");

  // Booking, payment, and passenger data must never be accessible to guests.
  const guestBookingCreate = await fetch(base + "/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flightId: "f-1" }),
  });
  assert(guestBookingCreate.status === 401, "Guest cannot create a booking");

  const guestBookingRead = await fetch(base + `/bookings/${bookingIdA}`);
  assert(guestBookingRead.status === 401, "Guest cannot read private booking details");

  const guestPassengerRead = await fetch(base + `/bookings/${bookingIdA}/passengers`);
  assert(guestPassengerRead.status === 401, "Guest cannot read booking passenger data");

  const guestPaymentIntent = await fetch(base + `/bookings/${bookingIdA}/payment-intent`, { method: "POST" });
  assert(guestPaymentIntent.status === 401, "Guest cannot create a booking payment intent");

  const guestPaymentConfirm = await fetch(base + `/bookings/${bookingIdA}/confirm-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert(guestPaymentConfirm.status === 401, "Guest cannot confirm a booking payment");

  const customerPaymentIntent = await fetch(base + `/bookings/${bookingIdA}/payment-intent`, {
    method: "POST",
    headers: { Authorization: "Bearer " + customerToken },
  });
  const paymentIntentData = await customerPaymentIntent.json();
  assert(customerPaymentIntent.status === 200, "Customer can create a payment intent for their booking");

  const customerPaymentConfirmation = await fetch(base + `/bookings/${bookingIdA}/confirm-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + customerToken,
    },
    body: JSON.stringify({ paymentIntentId: paymentIntentData.paymentIntentId, paymentMethod: "card" }),
  });
  const paidBooking = await customerPaymentConfirmation.json();
  assert(customerPaymentConfirmation.status === 200, "Customer can complete payment for their booking");
  assert(paidBooking.paymentStatus === "paid", "Completed payment marks booking as paid");

  const guestPaymentCreate = await fetch(base + "/payments/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingRef: bookingIdA }),
  });
  assert(guestPaymentCreate.status === 401, "Guest cannot create a payment transaction");

  const guestPaymentRead = await fetch(base + "/payments/PAY_private_test");
  assert(guestPaymentRead.status === 401, "Guest cannot read a payment record");

  // Test 11: Register customer B
  const regEmailB = `bob_${Date.now()}@example.com`;
  const regB = await fetch(base + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Bob Dylan",
      email: regEmailB,
      password: "Password123!",
    }),
  });
  const bData = await regB.json();
  const tokenB = bData.token;

  // Test 12: Customer B attempts to access Customer A's private booking
  const bAccessA = await fetch(base + `/bookings/${bookingIdA}`, {
    headers: { Authorization: "Bearer " + tokenB },
  });
  assert(bAccessA.status === 403, "Customer B cannot access Customer A's booking (403 Forbidden)");

  const bPassengerAccessA = await fetch(base + `/bookings/${bookingIdA}/passengers`, {
    headers: { Authorization: "Bearer " + tokenB },
  });
  assert(bPassengerAccessA.status === 403, "Customer B cannot access Customer A's passenger details (403 Forbidden)");

  // Test 13: Customer A accesses their own booking
  const aAccessA = await fetch(base + `/bookings/${bookingIdA}`, {
    headers: { Authorization: "Bearer " + customerToken },
  });
  assert(aAccessA.status === 200, "Customer A can access their own booking (200 OK)");

  // Test 14: Customer A fetches their personal booking list
  const myBookings = await fetch(base + "/bookings/my", {
    headers: { Authorization: "Bearer " + customerToken },
  });
  const myBookingsData = await myBookings.json();
  assert(myBookings.status === 200, "Customer can query /api/bookings/my");
  assert(
    Array.isArray(myBookingsData) && myBookingsData.some((b) => b.bookingId === bookingIdA),
    "Customer personal bookings list includes their booking"
  );

  // Test 15: Invalid / forged token
  const invalidTokenRes = await fetch(base + "/auth/me", {
    headers: { Authorization: "Bearer forged.token.value" },
  });
  assert(invalidTokenRes.status === 401, "Forged token rejected with 401 Unauthorized");

  // Test 16: Admin list all users
  const usersRes = await fetch(base + "/auth/admin/users", {
    headers: { Authorization: "Bearer " + adminToken },
  });
  const usersData = await usersRes.json();
  assert(usersRes.status === 200, "Admin can list registered users");
  assert(Array.isArray(usersData) && usersData.length >= 2, "User list contains registered customer and admin");

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
