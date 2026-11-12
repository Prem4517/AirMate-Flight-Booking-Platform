async function runAdminPortalTests() {
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

  console.log("=================================================");
  console.log("Starting AirMate Operations Portal Test Suite");
  console.log("=================================================\n");

  // 1. Authorization Tests
  console.log("--- 1. Security & Role Authorization Tests ---");

  // 1.1 Unauthenticated access to admin overview
  const unauthRes = await fetch(base + "/admin/overview");
  assert(unauthRes.status === 401, "Unauthenticated GET /api/admin/overview returns 401 Unauthorized");

  // 1.2 Customer login
  const custEmail = `passenger_${Date.now()}@example.com`;
  const regRes = await fetch(base + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Jane Passenger", email: custEmail, password: "Password123!" }),
  });
  const regData = await regRes.json();
  const customerToken = regData.token;

  // 1.3 Customer access to admin overview (must be 403)
  const custAdminRes = await fetch(base + "/admin/overview", {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custAdminRes.status === 403, "Customer token to GET /api/admin/overview returns 403 Forbidden");

  // 1.4 Customer attempt to create flight (must be 403)
  const custFlightRes = await fetch(base + "/admin/flights", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ flightNumber: "HACK-999", airline: "Rogue", price: 100 }),
  });
  assert(custFlightRes.status === 403, "Customer token to POST /api/admin/flights returns 403 Forbidden");

  // 1.5 Admin login
  const adminLoginRes = await fetch(base + "/auth/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@airmate.com", password: "Admin@AirMate2026!" }),
  });
  const adminLoginData = await adminLoginRes.json();
  assert(adminLoginRes.status === 200, "Admin login succeeds with 200 OK");
  assert(adminLoginData.user.role === "admin", "Admin user role is verified as 'admin'");
  const adminToken = adminLoginData.token;
  const adminHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`,
  };

  // 2. Metrics & Precision Reporting Tests
  console.log("\n--- 2. Metrics & Precision Reporting Tests ---");
  const overviewRes = await fetch(base + "/admin/overview", { headers: adminHeaders });
  const overviewData = await overviewRes.json();
  assert(overviewRes.status === 200, "Admin GET /api/admin/overview returns 200 OK");
  assert(typeof overviewData.metrics.flightCount === "number", "Metrics include flightCount");
  assert(typeof overviewData.metrics.confirmedBookings === "number", "Metrics include confirmedBookings");
  assert(typeof overviewData.metrics.registeredUsers === "number", "Metrics include registeredUsers");
  assert(typeof overviewData.metrics.totalPassengers === "number", "Metrics include totalPassengers");
  assert(typeof overviewData.metrics.collectedRevenue === "number", "Metrics include collectedRevenue");
  assert(typeof overviewData.metrics.pendingPayments === "number", "Metrics include pendingPayments");
  assert(typeof overviewData.metrics.cancellations === "number", "Metrics include cancellations");
  assert(typeof overviewData.metrics.refunds === "number", "Metrics include refunds");
  assert(overviewData.definitions && overviewData.definitions.collectedRevenue.includes("Excludes"), "Metric definitions clearly document revenue criteria");

  // 3. Analytics Tests
  console.log("\n--- 3. Operations Analytics Tests ---");
  const analyticsRes = await fetch(base + "/admin/analytics", { headers: adminHeaders });
  const analyticsData = await analyticsRes.json();
  assert(analyticsRes.status === 200, "Admin GET /api/admin/analytics returns 200 OK");
  assert(Array.isArray(analyticsData.monthlyRevenue), "Analytics includes monthlyRevenue array");
  assert(Array.isArray(analyticsData.bookingTrends), "Analytics includes bookingTrends array");
  assert(Array.isArray(analyticsData.popularRoutes), "Analytics includes popularRoutes array");
  assert(Array.isArray(analyticsData.flightOccupancy), "Analytics includes flightOccupancy array");
  assert(Array.isArray(analyticsData.airlinePerformance), "Analytics includes airlinePerformance array");

  // 4. Flight Management CRUD & Validation
  console.log("\n--- 4. Flight Operations CRUD & Validation ---");

  // 4.1 Invalid creation (missing fields)
  const badFlightRes = await fetch(base + "/admin/flights", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ flightNumber: "TEST-01" }), // missing airline, from, to, etc.
  });
  assert(badFlightRes.status === 400, "Creating flight without required fields returns 400 Bad Request");

  // 4.2 Valid flight creation
  const newFlightPayload = {
    flightNumber: "AM-909",
    airline: "AirMate Express",
    aircraft: "Boeing 737 MAX 8",
    from: "Delhi",
    fromCode: "DEL",
    to: "Goa",
    toCode: "GOI",
    departure: "06:30",
    arrival: "09:00",
    durationMins: 150,
    price: 4999,
    seatsTotal: 180,
    seatsBooked: 0,
    status: "Scheduled",
  };
  const createFlightRes = await fetch(base + "/admin/flights", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(newFlightPayload),
  });
  const createdFlight = await createFlightRes.json();
  assert(createFlightRes.status === 201, "Creating valid flight returns 201 Created");
  assert(createdFlight.flightNumber === "AM-909", "Created flight has correct flightNumber");
  assert(createdFlight.seatsAvailable === 180, "seatsAvailable correctly computed");
  const createdFlightId = createdFlight.id;

  // 4.3 Update flight
  const updateRes = await fetch(base + `/admin/flights/${createdFlightId}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ price: 5499, gate: "B4" }),
  });
  const updatedFlight = await updateRes.json();
  assert(updateRes.status === 200, "Updating flight returns 200 OK");
  assert(updatedFlight.price === 5499, "Flight price updated successfully");

  // 4.4 Reschedule flight
  const reschedRes = await fetch(base + `/admin/flights/${createdFlightId}/reschedule`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({
      departure: "07:15",
      arrival: "09:45",
      reason: "Air Traffic Control Slot Delay",
    }),
  });
  const reschedFlight = await reschedRes.json();
  assert(reschedRes.status === 200, "Rescheduling flight returns 200 OK");
  assert(reschedFlight.departure === "07:15", "Departure time updated in schedule");
  assert(reschedFlight.status === "Delayed", "Flight marked as Delayed on reschedule");

  // 4.5 Status update
  const statusRes = await fetch(base + `/admin/flights/${createdFlightId}/status`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "On Time", reason: "Weather cleared" }),
  });
  const statusFlight = await statusRes.json();
  assert(statusRes.status === 200, "Updating flight status returns 200 OK");
  assert(statusFlight.status === "On Time", "Flight status set to 'On Time'");

  // 4.6 Cancel flight
  const cancelRes = await fetch(base + `/admin/flights/${createdFlightId}/cancel`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ reason: "Aircraft maintenance check" }),
  });
  const cancelFlight = await cancelRes.json();
  assert(cancelRes.status === 200, "Cancelling flight returns 200 OK");
  assert(cancelFlight.status === "Cancelled", "Flight status updated to 'Cancelled'");

  // 4.7 Delete flight with no bookings (should succeed)
  const delRes = await fetch(base + `/admin/flights/${createdFlightId}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  assert(delRes.status === 200, "Safe delete of flight with no bookings returns 200 OK");

  // 5. Booking Management & Refund
  console.log("\n--- 5. Booking Operations & Refund Workflow ---");
  const bookingsRes = await fetch(base + "/admin/bookings?page=1&limit=10", { headers: adminHeaders });
  const bookingsData = await bookingsRes.json();
  assert(bookingsRes.status === 200, "Admin GET /api/admin/bookings returns 200 OK");
  assert(Array.isArray(bookingsData.bookings), "Returns list of bookings");
  assert(bookingsData.total > 0, "Initial demo bookings are available in directory");

  // Pick first booking
  const sampleBooking = bookingsData.bookings[0];
  const sampleRef = sampleBooking.bookingRef;

  // 5.1 Get booking details
  const detailRes = await fetch(base + `/admin/bookings/${sampleRef}`, { headers: adminHeaders });
  const detailData = await detailRes.json();
  assert(detailRes.status === 200, `Admin GET /api/admin/bookings/${sampleRef} returns 200 OK`);
  assert(detailData.bookingRef === sampleRef, "Booking details match reference");
  assert(Array.isArray(detailData.passengers), "Passenger details manifest present");

  // 5.2 Update booking status
  const updateBookingRes = await fetch(base + `/admin/bookings/${sampleRef}/status`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ bookingStatus: "confirmed", reason: "Operations manifest check" }),
  });
  assert(updateBookingRes.status === 200, "Updating booking status returns 200 OK");

  // 5.3 Refund booking
  // Find a booking that is paid or use the sample
  const paidBooking = bookingsData.bookings.find((b) => b.paymentStatus === "paid") || sampleBooking;
  const refundRes = await fetch(base + `/admin/bookings/${paidBooking.bookingRef}/refund`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ reason: "Customer requested cancellation within window" }),
  });
  const refundData = await refundRes.json();
  assert(refundRes.status === 200, `Admin refund for booking ${paidBooking.bookingRef} returns 200 OK`);
  assert(refundData.booking.paymentStatus === "refunded", "Payment status updated to 'refunded'");
  assert(refundData.booking.bookingStatus === "cancelled", "Booking status set to 'cancelled'");

  // 5.4 Duplicate refund attempt (must fail)
  const dupRefundRes = await fetch(base + `/admin/bookings/${paidBooking.bookingRef}/refund`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ reason: "Duplicate attempt" }),
  });
  assert(dupRefundRes.status === 400, "Duplicate refund attempt returns 400 Conflict/Bad Request");

  // 6. User Management & Security Safeguards
  console.log("\n--- 6. User Directory & Security Safeguards ---");
  const usersRes = await fetch(base + "/admin/users?page=1&limit=10", { headers: adminHeaders });
  const usersData = await usersRes.json();
  assert(usersRes.status === 200, "Admin GET /api/admin/users returns 200 OK");
  assert(Array.isArray(usersData.users), "Returns users array");

  // Verify passwordHash is NEVER exposed
  const hasPasswordHash = usersData.users.some((u) => u.passwordHash !== undefined);
  assert(!hasPasswordHash, "Security: passwordHash is NEVER exposed in admin user responses");

  // Find the customer created earlier
  const targetCust = usersData.users.find((u) => u.email === custEmail);
  if (targetCust) {
    // 6.1 Suspend customer account
    const suspendRes = await fetch(base + `/admin/users/${targetCust.id}/status`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ accountStatus: "suspended" }),
    });
    const suspendData = await suspendRes.json();
    assert(suspendRes.status === 200, "Suspending user returns 200 OK");
    assert(suspendData.accountStatus === "suspended", "User accountStatus updated to 'suspended'");

    // 6.2 Reactivate customer account
    const activateRes = await fetch(base + `/admin/users/${targetCust.id}/status`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ accountStatus: "active" }),
    });
    const activateData = await activateRes.json();
    assert(activateRes.status === 200, "Reactivating user returns 200 OK");
    assert(activateData.accountStatus === "active", "User accountStatus restored to 'active'");
  }

  // 6.3 Admin attempts to suspend own account (must fail)
  const adminSelfSuspendRes = await fetch(base + `/admin/users/${adminLoginData.user.id}/status`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ accountStatus: "suspended" }),
  });
  assert(adminSelfSuspendRes.status === 400, "Self-suspension prevention: Admin cannot suspend own account");

  // 6.4 Admin attempts to demote own account (must fail)
  const adminSelfDemoteRes = await fetch(base + `/admin/users/${adminLoginData.user.id}/role`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ role: "customer" }),
  });
  assert(adminSelfDemoteRes.status === 400, "Self-demotion prevention: Admin cannot remove own admin role");

  // 7. Audit Trails
  console.log("\n--- 7. Security Audit Trails Verification ---");
  const auditRes = await fetch(base + "/admin/audit-logs?page=1&limit=20", { headers: adminHeaders });
  const auditData = await auditRes.json();
  assert(auditRes.status === 200, "Admin GET /api/admin/audit-logs returns 200 OK");
  assert(Array.isArray(auditData.logs) && auditData.logs.length > 0, "Audit logs contain logged actions");
  const actionsLogged = auditData.logs.map((l) => l.action);
  assert(actionsLogged.includes("FLIGHT_CREATE"), "Audit trail contains FLIGHT_CREATE action");
  assert(actionsLogged.includes("BOOKING_REFUND"), "Audit trail contains BOOKING_REFUND action");

  // 8. CSV Exports
  console.log("\n--- 8. CSV Data Exports Verification ---");
  const exportFlightsRes = await fetch(base + "/admin/export/flights", { headers: adminHeaders });
  const flightsCsv = await exportFlightsRes.text();
  assert(exportFlightsRes.status === 200, "GET /api/admin/export/flights returns 200 OK");
  assert(flightsCsv.includes("Flight Number") && flightsCsv.includes("Airline"), "Flights CSV contains header columns");

  const exportBookingsRes = await fetch(base + "/admin/export/bookings", { headers: adminHeaders });
  const bookingsCsv = await exportBookingsRes.text();
  assert(exportBookingsRes.status === 200, "GET /api/admin/export/bookings returns 200 OK");
  assert(bookingsCsv.includes("Booking Ref") && bookingsCsv.includes("Customer Email"), "Bookings CSV contains header columns");

  const exportUsersRes = await fetch(base + "/admin/export/users", { headers: adminHeaders });
  const usersCsv = await exportUsersRes.text();
  assert(exportUsersRes.status === 200, "GET /api/admin/export/users returns 200 OK");
  assert(usersCsv.includes("Email") && !usersCsv.includes("passwordHash"), "Users CSV contains users and excludes passwordHash");

  const exportAuditRes = await fetch(base + "/admin/export/audit-logs", { headers: adminHeaders });
  const auditCsv = await exportAuditRes.text();
  assert(exportAuditRes.status === 200, "GET /api/admin/export/audit-logs returns 200 OK");
  assert(auditCsv.includes("Timestamp") && auditCsv.includes("Admin Email"), "Audit logs CSV contains header columns");

  console.log("\n=================================================");
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminPortalTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
