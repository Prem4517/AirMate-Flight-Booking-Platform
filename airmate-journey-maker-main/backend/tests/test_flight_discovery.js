async function runDiscoveryTests() {
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

  console.log("Starting Flight Discovery & Search Engine Test Suite...\n");

  // Test 1: Fetch flights default
  const res1 = await fetch(base + "/flights");
  const data1 = await res1.json();
  assert(res1.status === 200, "GET /api/flights returns 200 OK");
  assert(Array.isArray(data1.flights) && data1.flights.length > 0, "Returns flights array");
  assert(data1.pagination && data1.pagination.total > 0, "Returns pagination object with total");
  assert(data1.meta && data1.meta.isSimulated === true, "Marks data with isSimulated flag and demo disclaimer");

  // Public home-card features must work for guests without a bearer token.
  const recommendations = await fetch(base + "/flights/recommendations?sortBy=value&limit=6");
  const recommendationsData = await recommendations.json();
  assert(recommendations.status === 200, "Guest can load Explore Recommended Flights");
  assert(Array.isArray(recommendationsData.flights) && recommendationsData.flights.length > 0, "Guest receives recommended flights");

  const statusFlightNumber = encodeURIComponent(data1.flights[0].flightNumber);
  const statusRes = await fetch(base + `/flights/status?flightNumber=${statusFlightNumber}`);
  const statusData = await statusRes.json();
  assert(statusRes.status === 200, "Guest can check flight status");
  assert(statusData.flight?.flightNumber === data1.flights[0].flightNumber, "Flight status response matches the requested flight");

  const baggageRes = await fetch(base + "/promos/baggage-calculator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ airline: "AirMate Express", cabinClass: "Economy", checkinKg: 20, cabinKg: 7 }),
  });
  const baggageData = await baggageRes.json();
  assert(baggageRes.status === 200, "Guest can calculate baggage fees");
  assert(typeof baggageData.totalExcessFee === "number", "Baggage calculator returns an estimate");

  // Test 2: Validation - Same origin and destination
  const resSame = await fetch(base + "/flights?from=Delhi&to=Delhi");
  const dataSame = await resSame.json();
  assert(resSame.status === 400, "Same origin and destination returns 400 Bad Request");
  assert(dataSame.message.includes("different"), "Error message explains origin and destination must differ");

  // Test 3: Validation - Past departure date
  const resPast = await fetch(base + "/flights?date=2020-01-01");
  const dataPast = await resPast.json();
  assert(resPast.status === 400, "Past departure date returns 400 Bad Request");
  assert(dataPast.message.includes("past"), "Error message explains departure date cannot be in the past");

  // Test 4: Validation - Return date before departure date
  const resBadReturn = await fetch(base + "/flights?date=2026-11-20&returnDate=2026-11-10");
  const dataBadReturn = await resBadReturn.json();
  assert(resBadReturn.status === 400, "Return date earlier than departure returns 400 Bad Request");
  assert(dataBadReturn.message.includes("earlier"), "Error message explains return date constraint");

  // Test 5: Validation - Invalid passenger count
  const resBadPax = await fetch(base + "/flights?passengers=15");
  const dataBadPax = await resBadPax.json();
  assert(resBadPax.status === 400, "Passenger count > 9 returns 400 Bad Request");

  // Test 6: Route Search - Origin & Destination
  const resRoute = await fetch(base + "/flights?from=Delhi&to=Mumbai");
  const dataRoute = await resRoute.json();
  assert(resRoute.status === 200, "Route search DEL -> BOM returns 200 OK");
  assert(
    dataRoute.flights.every(
      (f) =>
        (f.from.toLowerCase() === "delhi" || f.fromCode === "DEL") &&
        (f.to.toLowerCase() === "mumbai" || f.toCode === "BOM")
    ),
    "All returned flights match DEL -> BOM route"
  );

  // Test 7: Filter by Max Price
  const resPrice = await fetch(base + "/flights?maxPrice=4000");
  const dataPrice = await resPrice.json();
  assert(resPrice.status === 200, "Max price filter returns 200 OK");
  assert(
    dataPrice.flights.every((f) => f.price <= 4000),
    "All returned flights have price <= 4000"
  );

  // Test 8: Filter by Max Duration
  const resDur = await fetch(base + "/flights?maxDuration=80");
  const dataDur = await resDur.json();
  assert(resDur.status === 200, "Max duration filter returns 200 OK");
  assert(
    dataDur.flights.every((f) => f.durationMins <= 80),
    "All returned flights have duration <= 80 minutes"
  );

  // Test 9: Filter by Airline
  const resAir = await fetch(base + "/flights?airline=IndiGo");
  const dataAir = await resAir.json();
  assert(resAir.status === 200, "Airline filter returns 200 OK");
  assert(
    dataAir.flights.every((f) => f.airline.toLowerCase() === "indigo"),
    "All returned flights are from IndiGo"
  );

  // Test 10: Filter by Non-Stop
  const resStops = await fetch(base + "/flights?stops=0");
  const dataStops = await resStops.json();
  assert(resStops.status === 200, "Stops filter returns 200 OK");
  assert(
    dataStops.flights.every((f) => f.stops === 0),
    "All returned flights are non-stop"
  );

  // Test 11: Filter by Departure Window (Morning: 04:00 - 11:59)
  const resWindow = await fetch(base + "/flights?departureWindow=morning");
  const dataWindow = await resWindow.json();
  assert(resWindow.status === 200, "Morning departure window returns 200 OK");
  assert(
    dataWindow.flights.every((f) => {
      const h = parseInt(f.departure.split(":")[0], 10);
      return h >= 4 && h < 12;
    }),
    "All morning flights depart between 04:00 and 11:59"
  );

  // Test 12: Sort by Cheapest
  const resCheapest = await fetch(base + "/flights?sortBy=cheapest&limit=10");
  const dataCheapest = await resCheapest.json();
  let isSortedPrice = true;
  for (let i = 1; i < dataCheapest.flights.length; i++) {
    if (dataCheapest.flights[i].price < dataCheapest.flights[i - 1].price) {
      isSortedPrice = false;
      break;
    }
  }
  assert(isSortedPrice, "Flights correctly sorted by price ascending");

  // Test 13: Sort by Fastest
  const resFastest = await fetch(base + "/flights?sortBy=fastest&limit=10");
  const dataFastest = await resFastest.json();
  let isSortedDuration = true;
  for (let i = 1; i < dataFastest.flights.length; i++) {
    if (dataFastest.flights[i].durationMins < dataFastest.flights[i - 1].durationMins) {
      isSortedDuration = false;
      break;
    }
  }
  assert(isSortedDuration, "Flights correctly sorted by duration ascending");

  // Test 14: Sort by Earliest Departure
  const resEarliest = await fetch(base + "/flights?sortBy=earliest&limit=10");
  const dataEarliest = await resEarliest.json();
  let isSortedEarliest = true;
  for (let i = 1; i < dataEarliest.flights.length; i++) {
    if (dataEarliest.flights[i].departure < dataEarliest.flights[i - 1].departure) {
      isSortedEarliest = false;
      break;
    }
  }
  assert(isSortedEarliest, "Flights correctly sorted by earliest departure time");

  // Test 15: Pagination
  const resPage1 = await fetch(base + "/flights?page=1&limit=2");
  const dataPage1 = await resPage1.json();
  assert(dataPage1.flights.length === 2, "Page 1 returns exactly limit=2 flights");
  assert(dataPage1.pagination.page === 1, "Pagination indicates page 1");
  assert(dataPage1.pagination.totalPages >= 2, "Calculates multiple total pages");
  assert(dataPage1.pagination.hasMore === true, "Indicates more pages available");

  const resPage2 = await fetch(base + "/flights?page=2&limit=2");
  const dataPage2 = await resPage2.json();
  assert(
    dataPage2.flights[0].id !== dataPage1.flights[0].id,
    "Page 2 returns different set of flights than page 1"
  );

  // Test 16: Get Flight Details by ID
  const flightId = data1.flights[0].id;
  const resDetail = await fetch(base + `/flights/${flightId}`);
  const dataDetail = await resDetail.json();
  assert(resDetail.status === 200, `GET /api/flights/${flightId} returns 200 OK`);
  assert(dataDetail.flightNumber, "Flight details contain flight number");
  assert(dataDetail.fareBreakdown && dataDetail.fareBreakdown.baseFare > 0, "Flight contains itemized fare breakdown");
  assert(Array.isArray(dataDetail.cabinClasses) && dataDetail.cabinClasses.length > 0, "Flight contains cabin classes list");

  // Test 17: Non-existent Flight ID
  const resNotFound = await fetch(base + "/flights/fl_non_existent_9999");
  assert(resNotFound.status === 404, "Invalid flight ID returns 404 Not Found");

  console.log("\n========================================");
  console.log(`Flight Discovery Tests: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runDiscoveryTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
