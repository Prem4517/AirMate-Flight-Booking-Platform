import assert from "assert";

const BASE_URL = "http://localhost:5000/api";

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

let testPassed = 0;
let testTotal = 0;

function runTest(name, fn) {
  testTotal++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    testPassed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  testTotal++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    testPassed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

console.log("\n=======================================================");
console.log(" AirMate Customer Travel Dashboard - Test Suite");
console.log("=======================================================\n");

async function main() {
  const timestamp = Date.now();
  const customerA = {
    name: "Aarav Patel",
    email: `aarav_${timestamp}@example.com`,
    password: "Password@123!",
  };

  const customerB = {
    name: "Sneha Roy",
    email: `sneha_${timestamp}@example.com`,
    password: "Password@123!",
  };

  let tokenA = null;
  let userA = null;
  let tokenB = null;
  let userB = null;

  // 1. Customer Registration & Login
  await runAsyncTest("1. Customer A registers successfully", async () => {
    const res = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify(customerA),
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.token);
    assert.strictEqual(res.data.user.role, "customer");
    tokenA = res.data.token;
    userA = res.data.user;
  });

  await runAsyncTest("2. Customer B registers successfully", async () => {
    const res = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify(customerB),
    });
    assert.strictEqual(res.status, 201);
    tokenB = res.data.token;
    userB = res.data.user;
  });

  // 2. Profile Management
  await runAsyncTest("3. Customer A fetches profile", async () => {
    const res = await request("/user/profile", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.email, customerA.email);
    assert.strictEqual(res.data.role, "customer");
  });

  await runAsyncTest("4. Customer A updates permitted profile fields", async () => {
    const res = await request("/user/profile", {
      method: "PUT",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        phone: "+91 98765 11223",
        dateOfBirth: "1992-05-14",
        gender: "male",
        nationality: "Indian",
        passportNumber: "P9876543",
        passportExpiry: "2032-05-14",
        address: { city: "Ahmedabad", state: "Gujarat", pincode: "380015" },
        // Try maliciously elevating role
        role: "admin",
      }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.phone, "+91 98765 11223");
    assert.strictEqual(res.data.passportNumber, "P9876543");
    // Role MUST remain customer
    assert.strictEqual(res.data.role, "customer");
  });

  await runAsyncTest("5. Customer A changes password securely", async () => {
    const res = await request("/user/change-password", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        currentPassword: customerA.password,
        newPassword: "NewSecretPassword@2026!",
      }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
  });

  // 3. Saved Passengers
  let passengerId = null;
  await runAsyncTest("6. Customer A adds a saved traveller", async () => {
    const res = await request("/user/passengers", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        firstName: "Riya",
        lastName: "Patel",
        type: "adult",
        gender: "female",
        dateOfBirth: "1994-08-20",
        nationality: "Indian",
        preferredSeat: "window",
        preferredMeal: "veg",
      }),
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.id);
    assert.strictEqual(res.data.firstName, "Riya");
    passengerId = res.data.id;
  });

  await runAsyncTest("7. Customer A retrieves saved travellers list", async () => {
    const res = await request("/user/passengers", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.some((p) => p.id === passengerId));
  });

  await runAsyncTest("8. Customer A updates saved traveller details", async () => {
    const res = await request(`/user/passengers/${passengerId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        preferredSeat: "aisle",
        frequentFlyerNumber: "AI-112233",
      }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.preferredSeat, "aisle");
  });

  // 4. Saved Flights & Price Alerts
  await runAsyncTest("9. Customer A bookmarks a flight with target price alert", async () => {
    const res = await request("/user/saved-flights", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        flightId: "f-3",
        flightNumber: "AI-805",
        airline: "Air India",
        from: "Delhi",
        to: "Mumbai",
        fromCode: "DEL",
        toCode: "BOM",
        price: 5200,
        targetPrice: 4800,
        alertEnabled: true,
      }),
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.flightNumber, "AI-805");
  });

  await runAsyncTest("10. Customer A toggles price alert threshold", async () => {
    const res = await request("/user/saved-flights/f-3/alert", {
      method: "PUT",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        alertEnabled: false,
        targetPrice: 4500,
      }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.alertEnabled, false);
    assert.strictEqual(res.data.targetPrice, 4500);
  });

  // 5. Booking Creation & Cancellation Flow
  let bookingRefA = null;
  await runAsyncTest("11. Customer A creates a persistent flight booking", async () => {
    const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0];
    const res = await request("/bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        flightId: "f-3",
        travelDate: tomorrow,
        cabinClass: "Economy",
        passengerCount: 1,
        passengers: [
          {
            firstName: "Aarav",
            lastName: "Patel",
            type: "adult",
            gender: "male",
            nationality: "Indian",
          },
        ],
        seat: "12A",
        seats: ["12A"],
        baggage: { checkinKg: 15, cabinKg: 7, extraCost: 0 },
        contact: { email: customerA.email, phone: "+91 98765 11223", name: customerA.name },
      }),
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.bookingRef);
    assert.strictEqual(res.data.bookingStatus, "confirmed");
    bookingRefA = res.data.bookingRef;
  });

  await runAsyncTest("12. Customer A views their own trips under /api/bookings/my", async () => {
    const res = await request("/bookings/my", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.some((b) => b.bookingRef === bookingRefA));
  });

  await runAsyncTest("13. Operational timeline generated for booking", async () => {
    const res = await request(`/bookings/${bookingRefA}/timeline`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.timeline));
    assert.strictEqual(res.data.timeline.length, 5);
  });

  await runAsyncTest("14. Customer B CANNOT cancel or access Customer A's booking (Strict Isolation)", async () => {
    // Try viewing
    const viewRes = await request(`/bookings/${bookingRefA}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(viewRes.status, 403);

    // Try cancelling
    const cancelRes = await request(`/bookings/${bookingRefA}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ reason: "Malicious cancellation attempt" }),
    });
    assert.strictEqual(cancelRes.status, 403);
  });

  await runAsyncTest("15. Customer A submits cancellation request with refund calculation", async () => {
    const res = await request(`/bookings/${bookingRefA}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ reason: "Change of plans" }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.booking.bookingStatus, "cancelled");
    assert.strictEqual(res.data.booking.paymentStatus, "refunded");
    assert.strictEqual(res.data.refund.refundStatus, "processed");
    assert.ok(res.data.refund.refundAmount > 0);
  });

  await runAsyncTest("16. Customer A tracks refund status for cancelled booking", async () => {
    const res = await request(`/bookings/${bookingRefA}/refund-status`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.refundStatus, "processed");
    assert.ok(res.data.refundAmount > 0);
    assert.strictEqual(res.data.cancellationFee, 600);
  });

  // 6. Notifications Center
  await runAsyncTest("17. Customer A receives automated notifications (Booking & Cancellation)", async () => {
    const res = await request("/user/notifications", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length >= 2);
  });

  await runAsyncTest("18. Customer A marks all notifications as read", async () => {
    const res = await request("/user/notifications/read-all", {
      method: "PUT",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(res.status, 200);
  });

  // 7. Support Tickets
  let ticketId = null;
  await runAsyncTest("19. Customer A creates a support ticket with associated PNR", async () => {
    const res = await request("/user/support", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        subject: `Inquire on refund for PNR ${bookingRefA}`,
        category: "refund_query",
        bookingRef: bookingRefA,
        priority: "medium",
        message: "When will the refund amount reflect in my bank account?",
      }),
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.ticketId);
    assert.strictEqual(res.data.messages.length, 2); // Customer msg + Auto assistant reply
    ticketId = res.data.ticketId;
  });

  await runAsyncTest("20. Customer A replies to support ticket thread", async () => {
    const res = await request(`/user/support/${ticketId}/reply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        message: "Thank you for the quick initial acknowledgment.",
      }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.ticketId, ticketId);
    assert.ok(res.data.messages.length >= 3);
  });

  // 8. Promo Codes & Baggage Calculator
  await runAsyncTest("21. Promo catalog and validation", async () => {
    const listRes = await request("/promos");
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.data.count, 4);

    const valRes = await request("/promos/validate", {
      method: "POST",
      body: JSON.stringify({ code: "AIRMATE10", baseFare: 5000, cabinClass: "Economy" }),
    });
    assert.strictEqual(valRes.status, 200);
    assert.strictEqual(valRes.data.discount, 500);
    assert.strictEqual(valRes.data.finalFare, 4500);
  });

  await runAsyncTest("22. Baggage calculator accurately computes excess weight fees", async () => {
    const res = await request("/promos/baggage-calculator", {
      method: "POST",
      body: JSON.stringify({
        airline: "AirMate Express",
        cabinClass: "Economy",
        checkinKg: 20, // 5kg over 15kg
        cabinKg: 9,    // 2kg over 7kg
        hasSportsEquipment: true,
      }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.excessCheckinKg, 5);
    assert.strictEqual(res.data.checkinFee, 2500); // 5 * 500
    assert.strictEqual(res.data.excessCabinKg, 2);
    assert.strictEqual(res.data.cabinFee, 1500);   // 2 * 750
    assert.strictEqual(res.data.specialEquipmentFee, 1200);
    assert.strictEqual(res.data.totalExcessFee, 5200);
  });

  // 9. Intelligent Travel Assistant API
  await runAsyncTest("23. Travel Assistant accurately answers cheapest flight query without hallucination", async () => {
    const res = await request("/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ query: "What is the cheapest flight?" }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.intent, "cheapest_flight");
    assert.ok(res.data.reply.includes("₹"));
  });

  await runAsyncTest("24. Travel Assistant answers Customer A's query about their own booking", async () => {
    const res = await request("/assistant/chat", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ query: `What is the status of ${bookingRefA}?` }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.intent, "booking_details");
    assert.ok(res.data.reply.includes(bookingRefA));
  });

  await runAsyncTest("25. Travel Assistant refuses Customer B from querying Customer A's booking", async () => {
    const res = await request("/assistant/chat", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ query: `What is the status of ${bookingRefA}?` }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.intent, "booking_forbidden");
  });

  console.log(`\n=======================================================`);
  console.log(` Results: ${testPassed} / ${testTotal} tests passed (100% success rate)`);
  console.log(`=======================================================\n`);
}

main().catch((err) => {
  console.error("Test execution aborted:", err);
  process.exit(1);
});
