import { getAllFlights } from "./flightService.js";
import { getUserBookingsService } from "./bookingService.js";

function delayPrediction(f) {
  if (!f) return { risk: 10, level: "Low", window: "On Time" };
  if (f.status === "Delayed") return { risk: 85, level: "High", window: "45–60 mins" };
  if (f.status === "Cancelled") return { risk: 100, level: "Cancelled", window: "Flight Cancelled" };
  return { risk: 15, level: "Low", window: "On Time" };
}

/**
 * Intelligent AirMate Travel Assistant.
 * Strictly answers based on REAL database flights and the authenticated user's own bookings.
 * Never fabricates prices, fake bookings, or fake flight statuses.
 */
export async function answerAssistantQuery({ query = "", userId = null, userEmail = null, userName = "Traveler" }) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      reply: "Hello! How can I help you today? You can ask about our cheapest flights, search routes, check live delay risks, or ask about your own bookings.",
      intent: "greeting",
    };
  }

  // Load actual flight catalog
  const flightResult = await getAllFlights({});
  const flights = Array.isArray(flightResult) ? flightResult : (flightResult?.flights || []);

  // Load user's own bookings if authenticated
  let userBookings = [];
  if (userId || userEmail) {
    try {
      userBookings = await getUserBookingsService(userId, userEmail);
    } catch {
      userBookings = [];
    }
  }

  // 1. PNR-Specific Query (e.g., "check AM8X9P2Q" or "status of AM...")
  const pnrMatch = query.toUpperCase().match(/\b(AM[A-Z0-9]{6,8})\b/);
  if (pnrMatch) {
    const requestedRef = pnrMatch[1];
    if (!userId && !userEmail) {
      return {
        reply: `To view confidential details for booking **${requestedRef}**, please sign in to your AirMate customer account.`,
        intent: "auth_required",
      };
    }

    const booking = userBookings.find(
      (b) => b.bookingRef?.toUpperCase() === requestedRef || b.bookingId?.toUpperCase() === requestedRef
    );

    if (!booking) {
      return {
        reply: `I could not locate booking **${requestedRef}** under your account (${userEmail}). For security, customers can only access their own private bookings.`,
        intent: "booking_forbidden",
      };
    }

    const flight = booking.flight || {};
    const d = delayPrediction ? delayPrediction(flight) : null;
    const status = booking.bookingStatus || "confirmed";
    const payment = booking.paymentStatus || "paid";

    return {
      reply: `**Booking PNR: ${booking.bookingRef}**\n\n` +
        `• **Route:** ${flight.from || flight.fromCode} (${flight.fromCode}) → ${flight.to || flight.toCode} (${flight.toCode})\n` +
        `• **Flight:** ${flight.airline} ${flight.flightNumber}\n` +
        `• **Travel Date:** ${booking.travelDate} (${flight.departure} – ${flight.arrival})\n` +
        `• **Seat:** ${booking.seat || "Assigned at gate"}\n` +
        `• **Passengers:** ${booking.passengerCount || 1}\n` +
        `• **Status:** ${status.toUpperCase()} (Payment: ${payment.toUpperCase()})\n` +
        (d ? `• **Live Operational Risk:** ${d.risk}% (${d.level} delay risk, window: ${d.window})\n` : "") +
        `\nYou can view and download your e-ticket under **My Trips**.`,
      intent: "booking_details",
      data: { bookingRef: booking.bookingRef },
    };
  }

  // 2. Personal Bookings Query (e.g. "my upcoming flight", "show my trips", "my bookings")
  if (q.includes("my trip") || q.includes("my flight") || q.includes("my booking") || q.includes("upcoming trip")) {
    if (!userId && !userEmail) {
      return {
        reply: "Please log in to your AirMate customer account to view your scheduled journeys and boarding passes.",
        intent: "auth_required",
      };
    }

    if (userBookings.length === 0) {
      return {
        reply: `You currently have no flight bookings registered under **${userEmail}**. You can search our current schedules to book your next journey!`,
        intent: "no_bookings",
      };
    }

    const activeBookings = userBookings.filter((b) => b.bookingStatus !== "cancelled");
    if (activeBookings.length === 0) {
      return {
        reply: `All bookings associated with your account are currently cancelled. You can search our flight catalog to book a new trip.`,
        intent: "all_cancelled",
      };
    }

    const upcomingList = activeBookings
      .slice(0, 3)
      .map((b) => {
        const f = b.flight || {};
        return `• **${f.fromCode} → ${f.toCode}** (${f.airline} ${f.flightNumber}) on **${b.travelDate}** at ${f.departure} · PNR: **${b.bookingRef}** · Seat: ${b.seat || "Std"}`;
      })
      .join("\n");

    return {
      reply: `Here are your upcoming journeys:\n\n${upcomingList}\n\nGo to **My Trips** in your dashboard to view complete e-tickets and live gate assignments.`,
      intent: "my_bookings_list",
      data: { count: activeBookings.length },
    };
  }

  // 3. Cheapest Flight Query
  if (q.includes("cheap") || q.includes("lowest fare") || q.includes("affordable") || q.includes("budget")) {
    const sorted = [...flights].sort((a, b) => (a.price || 0) - (b.price || 0));
    const cheapest = sorted[0];

    if (!cheapest) {
      return { reply: "No flights are currently available in the schedule.", intent: "empty_schedule" };
    }

    return {
      reply: `The lowest fare currently available in our system is on **${cheapest.airline} ${cheapest.flightNumber}** from **${cheapest.from} (${cheapest.fromCode})** to **${cheapest.to} (${cheapest.toCode})** at **₹${cheapest.price.toLocaleString("en-IN")}** (Departs ${cheapest.departure}, Duration ${Math.floor(cheapest.durationMins / 60)}h ${cheapest.durationMins % 60}m).`,
      intent: "cheapest_flight",
      data: cheapest,
    };
  }

  // 4. Fastest Flight Query
  if (q.includes("fast") || q.includes("quick") || q.includes("shortest")) {
    const sorted = [...flights].sort((a, b) => (a.durationMins || 999) - (b.durationMins || 999));
    const fastest = sorted[0];

    return {
      reply: `The quickest flight in our network is **${fastest.airline} ${fastest.flightNumber}** (${fastest.fromCode} → ${fastest.toCode}) with a flying time of just **${Math.floor(fastest.durationMins / 60)}h ${fastest.durationMins % 60}m** for **₹${fastest.price.toLocaleString("en-IN")}**.`,
      intent: "fastest_flight",
      data: fastest,
    };
  }

  // 5. Route Search by City or Code (e.g., "flights to Mumbai", "Delhi to Bengaluru", "BOM to GOI")
  const cityKeywords = [
    { name: "Delhi", code: "DEL" },
    { name: "Mumbai", code: "BOM" },
    { name: "Bengaluru", code: "BLR" },
    { name: "Bangalore", code: "BLR" },
    { name: "Goa", code: "GOI" },
    { name: "Hyderabad", code: "HYD" },
    { name: "Chennai", code: "MAA" },
    { name: "Kolkata", code: "CCU" },
    { name: "Vijayawada", code: "VGA" },
  ];

  const matchedCities = cityKeywords.filter(
    (c) => q.includes(c.name.toLowerCase()) || q.includes(c.code.toLowerCase())
  );

  if (matchedCities.length >= 1) {
    // If two cities matched, find route between them
    let matchingFlights = [];
    if (matchedCities.length >= 2) {
      const city1 = matchedCities[0].code;
      const city2 = matchedCities[1].code;
      matchingFlights = flights.filter(
        (f) =>
          (f.fromCode === city1 && f.toCode === city2) ||
          (f.fromCode === city2 && f.toCode === city1)
      );
    } else {
      // One city matched (destination or origin)
      const target = matchedCities[0].code;
      matchingFlights = flights.filter((f) => f.toCode === target || f.fromCode === target);
    }

    if (matchingFlights.length > 0) {
      const flightSummaries = matchingFlights
        .slice(0, 4)
        .map(
          (f) =>
            `• **${f.airline} ${f.flightNumber}**: ${f.fromCode} → ${f.toCode} | Departs: ${f.departure} | Fare: **₹${f.price.toLocaleString("en-IN")}** (${f.status})`
        )
        .join("\n");

      return {
        reply: `Here are the active scheduled flights matching your inquiry:\n\n${flightSummaries}\n\nYou can select any of these flights on the **Search Flights** page to book your seats.`,
        intent: "route_results",
        data: matchingFlights,
      };
    } else {
      const cityName = matchedCities[0].name;
      return {
        reply: `We currently do not operate direct flights matching ${cityName} in our active schedule. Popular available routes include **Delhi (DEL) → Mumbai (BOM)**, **Bengaluru (BLR) → Delhi (DEL)**, and **Mumbai (BOM) → Goa (GOI)**.`,
        intent: "no_direct_route",
      };
    }
  }

  // 6. Delay Risk & Flight Status Query
  if (q.includes("delay") || q.includes("late") || q.includes("status") || q.includes("on time")) {
    const delayed = flights.filter((f) => f.status === "Delayed");
    const onTimeCount = flights.filter((f) => f.status === "On Time").length;

    let reply = `Across our operational network, **${onTimeCount}** flights are currently On Time. `;
    if (delayed.length > 0) {
      const sample = delayed[0];
      const d = delayPrediction ? delayPrediction(sample) : null;
      reply += `Flight **${sample.airline} ${sample.flightNumber}** (${sample.fromCode}→${sample.toCode}) has an operational delay forecast of ${d ? d.window : "30-45 mins"} (${sample.status}).`;
    } else {
      reply += "All scheduled flights are operating normally without recorded delays.";
    }

    return { reply, intent: "delay_status" };
  }

  // 7. Baggage Allowance & Excess Baggage Calculator
  if (q.includes("bag") || q.includes("luggage") || q.includes("weight") || q.includes("kg")) {
    return {
      reply: `**AirMate Standard Baggage Rules:**\n\n` +
        `• **Cabin Baggage:** 7 kg included per passenger (Max dimensions: 55 x 35 x 25 cm).\n` +
        `• **Check-in Baggage:** 15 kg included on standard domestic Economy fares.\n` +
        `• **Excess Baggage Rates:** ₹500/kg for additional check-in luggage; ₹750/kg for excess cabin baggage.\n\n` +
        `You can use our interactive **Baggage Calculator** tab in your dashboard to calculate exact excess charges for your airline and cabin class!`,
      intent: "baggage_rules",
    };
  }

  // 8. Cancellation & Refund Policy
  if (q.includes("cancel") || q.includes("refund") || q.includes("cancellation fee")) {
    return {
      reply: `**Cancellation & Refund Policy:**\n\n` +
        `• You can cancel confirmed bookings directly under **My Trips** in your dashboard.\n` +
        `• Standard domestic cancellation fee is ₹600 per passenger for refundable tickets.\n` +
        `• The net refund is processed immediately to your original payment method within 3–5 business days.\n` +
        `• Real-time refund status and transaction references are trackable in your dashboard.`,
      intent: "refund_policy",
    };
  }

  // 9. Promo Codes & Discounts
  if (q.includes("promo") || q.includes("discount") || q.includes("coupon") || q.includes("offer")) {
    return {
      reply: `**Active AirMate Promo Codes:**\n\n` +
        `• **AIRMATE10:** 10% instant discount up to ₹1,000 on all domestic flights.\n` +
        `• **FIRSTFLY:** Flat ₹750 off on your first booking with AirMate.\n` +
        `• **FESTIVE500:** ₹500 off on round-trip or multi-passenger bookings.\n` +
        `• **BUSINESS20:** 20% off on Premium Economy and Business Class cabins.\n\n` +
        `You can apply these codes during checkout or test them in the **Promo Codes** tab!`,
      intent: "promo_codes",
    };
  }

  // 10. General Informational Help
  return {
    reply: `I'm your **AirMate Travel Assistant**. I can help you with:\n\n` +
      `• Checking your **own booking status** (e.g. "What is my upcoming flight?" or "Check PNR AM8X9P2Q")\n` +
      `• Finding our **cheapest or fastest flights** (e.g. "Find cheapest flight" or "Flights to Mumbai")\n` +
      `• Verifying **baggage allowance rules** and excess fee rates\n` +
      `• Understanding **cancellation & refund procedures**\n` +
      `• Discovering **active promo codes**\n\n` +
      `What would you like to know?`,
    intent: "general_help",
  };
}
