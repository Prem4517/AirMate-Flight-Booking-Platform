export const cities = [
  { code: "DEL", name: "Delhi", airport: "Indira Gandhi International Airport" },
  { code: "BOM", name: "Mumbai", airport: "Chhatrapati Shivaji Maharaj International Airport" },
  { code: "BLR", name: "Bangalore", airport: "Kempegowda International Airport" },
  { code: "HYD", name: "Hyderabad", airport: "Rajiv Gandhi International Airport" },
  { code: "MAA", name: "Chennai", airport: "Chennai International Airport" },
  { code: "CCU", name: "Kolkata", airport: "Netaji Subhash Chandra Bose International Airport" },
  { code: "GOI", name: "Goa", airport: "Dabolim International Airport" },
  { code: "VGA", name: "Vijayawada", airport: "Vijayawada International Airport" },
  { code: "PNQ", name: "Pune", airport: "Pune International Airport" },
  { code: "AMD", name: "Ahmedabad", airport: "Sardar Vallabhbhai Patel International Airport" },
  { code: "JAI", name: "Jaipur", airport: "Jaipur International Airport" },
  { code: "COK", name: "Kochi", airport: "Cochin International Airport" },
  { code: "LKO", name: "Lucknow", airport: "Chaudhary Charan Singh International Airport" },
  { code: "IXC", name: "Chandigarh", airport: "Shaheed Bhagat Singh International Airport" },
  { code: "VNS", name: "Varanasi", airport: "Lal Bahadur Shastri International Airport" },
  { code: "ATQ", name: "Amritsar", airport: "Sri Guru Ram Dass Jee International Airport" },
  { code: "SXR", name: "Srinagar", airport: "Sheikh ul-Alam International Airport" },
  { code: "VTZ", name: "Visakhapatnam", airport: "Visakhapatnam International Airport" },
  { code: "BBI", name: "Bhubaneswar", airport: "Biju Patnaik International Airport" },
  { code: "GAU", name: "Guwahati", airport: "Lokpriya Gopinath Bordoloi International Airport" },
  { code: "NAG", name: "Nagpur", airport: "Dr. Babasaheb Ambedkar International Airport" },
  { code: "IDR", name: "Indore", airport: "Devi Ahilyabai Holkar International Airport" },
  { code: "STV", name: "Surat", airport: "Surat International Airport" },
  { code: "PAT", name: "Patna", airport: "Jayprakash Narayan International Airport" },
  { code: "CJB", name: "Coimbatore", airport: "Coimbatore International Airport" },
  { code: "IXE", name: "Mangalore", airport: "Mangaluru International Airport" },
  { code: "IXB", name: "Bagdogra", airport: "Bagdogra International Airport" },
  { code: "IXZ", name: "Port Blair", airport: "Veer Savarkar International Airport" },
  { code: "DED", name: "Dehradun", airport: "Dehradun Airport" },
  { code: "BHO", name: "Bhopal", airport: "Raja Bhoj Airport" },
  { code: "TRV", name: "Thiruvananthapuram", airport: "Trivandrum International Airport" },
  { code: "UDR", name: "Udaipur", airport: "Maharana Pratap Airport" },
  { code: "DXB", name: "Dubai", airport: "Dubai International Airport" },
  { code: "SIN", name: "Singapore", airport: "Singapore Changi Airport" },
  { code: "BKK", name: "Bangkok", airport: "Suvarnabhumi Airport" },
  { code: "LHR", name: "London", airport: "Heathrow Airport" },
];

export const travelClasses = ["Economy", "Premium Economy", "Business", "First Class"];

const cheapDays = [
  { day: "Mon", price: 4499 },
  { day: "Tue", price: 4199 },
  { day: "Wed", price: 3899 },
  { day: "Thu", price: 4099 },
  { day: "Fri", price: 4899 },
  { day: "Sat", price: 5299 },
  { day: "Sun", price: 5099 },
];

export function cheapestDayHint(from = "", to = "") {
  const seed = (from + to).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pick = cheapDays[seed % cheapDays.length];
  return { day: pick.day, price: pick.price - (seed % 5) * 50 };
}

export const popularDestinations = [
  {
    city: "Delhi",
    code: "DEL",
    airport: "Indira Gandhi Intl",
    tag: "Capital classics",
    price: 4299,
    hue: "from-sky-500/80 to-blue-700/80",
  },
  {
    city: "Mumbai",
    code: "BOM",
    airport: "Chhatrapati Shivaji Maharaj Intl",
    tag: "Sea breeze & skyline",
    price: 3899,
    hue: "from-cyan-500/80 to-sky-700/80",
  },
  {
    city: "Bangalore",
    code: "BLR",
    airport: "Kempegowda Intl",
    tag: "Garden city gigs",
    price: 3199,
    hue: "from-teal-500/80 to-cyan-700/80",
  },
  {
    city: "Hyderabad",
    code: "HYD",
    airport: "Rajiv Gandhi Intl",
    tag: "Biryani runs",
    price: 2499,
    hue: "from-blue-500/80 to-indigo-700/80",
  },
  {
    city: "Chennai",
    code: "MAA",
    airport: "Chennai Intl",
    tag: "Marina mornings",
    price: 2899,
    hue: "from-sky-600/80 to-blue-800/80",
  },
  {
    city: "Kolkata",
    code: "CCU",
    airport: "Netaji Subhash Chandra Bose Intl",
    tag: "City of joy",
    price: 4599,
    hue: "from-indigo-500/80 to-blue-700/80",
  },
  {
    city: "Goa",
    code: "GOI",
    airport: "Dabolim International",
    tag: "Beaches & sunsets",
    price: 3699,
    hue: "from-amber-500/80 to-orange-700/80",
  },
  {
    city: "Jaipur",
    code: "JAI",
    airport: "Jaipur International",
    tag: "Pink City heritage",
    price: 3250,
    hue: "from-rose-500/80 to-pink-700/80",
  },
  {
    city: "Kochi",
    code: "COK",
    airport: "Cochin International",
    tag: "Backwaters & spice trails",
    price: 2899,
    hue: "from-emerald-500/80 to-teal-700/80",
  },
  {
    city: "Varanasi",
    code: "VNS",
    airport: "Lal Bahadur Shastri Intl",
    tag: "Ghats & sacred rivers",
    price: 3499,
    hue: "from-orange-500/80 to-amber-700/80",
  },
  {
    city: "Srinagar",
    code: "SXR",
    airport: "Sheikh ul-Alam Intl",
    tag: "Dal Lake & valleys",
    price: 4899,
    hue: "from-sky-500/80 to-indigo-700/80",
  },
];

export function makeFareBreakdown(price) {
  const baseFare = Math.round(price * 0.72);
  const fuelSurcharge = Math.round(price * 0.16);
  const airportTaxes = Math.round(price * 0.08);
  const userDevelopmentFee = price - (baseFare + fuelSurcharge + airportTaxes);
  return {
    baseFare,
    fuelSurcharge,
    airportTaxes,
    userDevelopmentFee,
    total: price,
  };
}

export const defaultCabinClasses = [
  {
    className: "Economy",
    priceMultiplier: 1,
    baggageKg: 15,
    cabinKg: 7,
    refundable: false,
    seatPitch: "30-31 inch",
  },
  {
    className: "Premium Economy",
    priceMultiplier: 1.45,
    baggageKg: 20,
    cabinKg: 10,
    refundable: true,
    seatPitch: "34-36 inch",
  },
  {
    className: "Business",
    priceMultiplier: 2.2,
    baggageKg: 30,
    cabinKg: 12,
    refundable: true,
    seatPitch: "40-42 inch recliner",
  },
  {
    className: "First Class",
    priceMultiplier: 3.5,
    baggageKg: 40,
    cabinKg: 15,
    refundable: true,
    seatPitch: "Flat-bed suite",
  },
];

export const flights = [
  {
    id: "f-1",
    airline: "AirMate Connect",
    flightNumber: "AM-204",
    aircraft: "ATR 72-600",
    from: "Vijayawada",
    fromCode: "VGA",
    fromAirport: "Vijayawada International Airport",
    fromTerminal: "T1",
    to: "Hyderabad",
    toCode: "HYD",
    toAirport: "Rajiv Gandhi International Airport",
    toTerminal: "T1",
    departure: "07:15",
    arrival: "08:15",
    duration: "1h 00m",
    durationMins: 60,
    stops: 0,
    stopDetails: [],
    price: 2850,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(2850),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 72,
    seatsBooked: 54,
    seatsAvailable: 18,
    status: "On Time",
    gate: "B3",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-2",
    airline: "AirMate Express",
    flightNumber: "AM-501",
    aircraft: "Airbus A320neo",
    from: "Delhi",
    fromCode: "DEL",
    fromAirport: "Indira Gandhi International Airport",
    fromTerminal: "T3",
    to: "Mumbai",
    toCode: "BOM",
    toAirport: "Chhatrapati Shivaji Maharaj International Airport",
    toTerminal: "T2",
    departure: "06:00",
    arrival: "08:10",
    duration: "2h 10m",
    durationMins: 130,
    stops: 0,
    stopDetails: [],
    price: 4999,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(4999),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 162,
    seatsAvailable: 18,
    status: "On Time",
    gate: "14A",
    terminal: "T3",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-3",
    airline: "IndiGo",
    flightNumber: "6E-532",
    aircraft: "Airbus A321neo",
    from: "Delhi",
    fromCode: "DEL",
    fromAirport: "Indira Gandhi International Airport",
    fromTerminal: "T1",
    to: "Mumbai",
    toCode: "BOM",
    toAirport: "Chhatrapati Shivaji Maharaj International Airport",
    toTerminal: "T1",
    departure: "11:30",
    arrival: "13:45",
    duration: "2h 15m",
    durationMins: 135,
    stops: 0,
    stopDetails: [],
    price: 4299,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(4299),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 222,
    seatsBooked: 198,
    seatsAvailable: 24,
    status: "On Time",
    gate: "22B",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-4",
    airline: "Air India",
    flightNumber: "AI-805",
    aircraft: "Boeing 787-8 Dreamliner",
    from: "Delhi",
    fromCode: "DEL",
    fromAirport: "Indira Gandhi International Airport",
    fromTerminal: "T3",
    to: "Mumbai",
    toCode: "BOM",
    toAirport: "Chhatrapati Shivaji Maharaj International Airport",
    toTerminal: "T2",
    departure: "18:45",
    arrival: "21:00",
    duration: "2h 15m",
    durationMins: 135,
    stops: 0,
    stopDetails: [],
    price: 5499,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(5499),
    checkinKg: 25,
    cabinKg: 8,
    baggage: "25 kg",
    seatsTotal: 256,
    seatsBooked: 241,
    seatsAvailable: 15,
    status: "On Time",
    gate: "09",
    terminal: "T3",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-5",
    airline: "SpiceJet",
    flightNumber: "SG-211",
    aircraft: "Boeing 737-800",
    from: "Delhi",
    fromCode: "DEL",
    fromAirport: "Indira Gandhi International Airport",
    fromTerminal: "T2",
    to: "Mumbai",
    toCode: "BOM",
    toAirport: "Chhatrapati Shivaji Maharaj International Airport",
    toTerminal: "T1",
    departure: "14:15",
    arrival: "18:25",
    duration: "4h 10m",
    durationMins: 250,
    stops: 1,
    stopDetails: [
      {
        airport: "Jaipur International Airport",
        code: "JAI",
        durationMins: 55,
      },
    ],
    price: 3699,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(3699),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 189,
    seatsBooked: 172,
    seatsAvailable: 17,
    status: "On Time",
    gate: "D4",
    terminal: "T2",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-6",
    airline: "AirMate Connect",
    flightNumber: "AM-308",
    aircraft: "Airbus A320neo",
    from: "Bangalore",
    fromCode: "BLR",
    fromAirport: "Kempegowda International Airport",
    fromTerminal: "T2",
    to: "Hyderabad",
    toCode: "HYD",
    toAirport: "Rajiv Gandhi International Airport",
    toTerminal: "T1",
    departure: "18:45",
    arrival: "20:00",
    duration: "1h 15m",
    durationMins: 75,
    stops: 0,
    stopDetails: [],
    price: 3100,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(3100),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 150,
    seatsAvailable: 30,
    status: "Delayed",
    gate: "C7",
    terminal: "T2",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-7",
    airline: "IndiGo",
    flightNumber: "6E-204",
    aircraft: "Airbus A320neo",
    from: "Vijayawada",
    fromCode: "VGA",
    fromAirport: "Vijayawada International Airport",
    fromTerminal: "T1",
    to: "Bangalore",
    toCode: "BLR",
    toAirport: "Kempegowda International Airport",
    toTerminal: "T1",
    departure: "09:40",
    arrival: "11:05",
    duration: "1h 25m",
    durationMins: 85,
    stops: 0,
    stopDetails: [],
    price: 3199,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(3199),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 152,
    seatsAvailable: 28,
    status: "On Time",
    gate: "B4",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
];

export const revenueSeries = [
  { month: "Jan", revenue: 412000, bookings: 118 },
  { month: "Feb", revenue: 468000, bookings: 132 },
  { month: "Mar", revenue: 521000, bookings: 149 },
  { month: "Apr", revenue: 498000, bookings: 141 },
  { month: "May", revenue: 612000, bookings: 173 },
  { month: "Jun", revenue: 704000, bookings: 198 },
  { month: "Jul", revenue: 668000, bookings: 186 },
  { month: "Aug", revenue: 742000, bookings: 211 },
];

export const popularRoutes = [
  { route: "DEL–BOM", trips: 312 },
  { route: "VGA–HYD", trips: 264 },
  { route: "BLR–MAA", trips: 231 },
  { route: "BOM–BLR", trips: 198 },
  { route: "HYD–DEL", trips: 176 },
  { route: "MAA–CCU", trips: 121 },
];

export const currency = (n) =>
  "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

export const formatDuration = (mins) => {
  const m = Number(mins) || 0;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};

// Recommendation score: lower score = better match for the chosen preference.
export function scoreFlight(flight, preference, all = []) {
  if (!all.length) return 0;
  const prices = all.map((f) => f.price);
  const durations = all.map((f) => f.durationMins);
  const norm = (v, arr) => {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    return max === min ? 0 : (v - min) / (max - min);
  };
  const hour = Number((flight.departure || "08:00").split(":")[0]);
  const morning = hour >= 5 && hour <= 11 ? 0 : Math.min(Math.abs(hour - 8) / 12, 1);
  const baggage = 1 - Math.min(((flight.checkinKg || 15) + (flight.cabinKg || 7)) / 35, 1);

  const weights = {
    price: { price: 0.6, duration: 0.15, baggage: 0.15, time: 0.1 },
    duration: { price: 0.15, duration: 0.6, baggage: 0.1, time: 0.15 },
    morning: { price: 0.2, duration: 0.2, baggage: 0.1, time: 0.5 },
  }[preference] || { price: 0.6, duration: 0.15, baggage: 0.15, time: 0.1 };

  return (
    weights.price * norm(flight.price, prices) +
    weights.duration * norm(flight.durationMins, durations) +
    weights.baggage * baggage +
    weights.time * morning
  );
}

export function recommendationReasons(flight, all = [], preference = "price") {
  if (!all.length) return ["Recommended on this route"];
  const reasons = [];
  const cheapest = Math.min(...all.map((f) => f.price));
  const fastest = Math.min(...all.map((f) => f.durationMins));
  const hour = Number((flight.departure || "08:00").split(":")[0]);
  if (flight.price <= cheapest * 1.08) reasons.push("Lowest fare on this route");
  if (flight.durationMins <= fastest * 1.1) reasons.push("Shortest travel time");
  if ((flight.checkinKg || 0) >= 20) reasons.push(`Generous ${flight.checkinKg}kg baggage`);
  if (flight.stops === 0) reasons.push("Direct non-stop service");
  if (hour >= 5 && hour <= 11) reasons.push("Convenient morning departure slot");
  if (flight.status === "On Time") reasons.push("Strong on-time track record");
  if (!reasons.length) reasons.push("Best balance of price and schedule");
  return reasons.slice(0, 3);
}

// Delay prediction based on airline, time of day and load factor.
export function delayPrediction(flight = {}) {
  const hour = Number((flight.departure || "10:00").split(":")[0]);
  const booked = flight.seatsBooked || 120;
  const total = flight.seatsTotal || 180;
  const load = booked / (total || 1);
  let risk = 18 + load * 40 + (hour >= 17 ? 22 : hour <= 8 ? -6 : 8);
  if (flight.status === "Delayed") risk += 25;
  if (flight.status === "Cancelled") risk = 100;
  risk = Math.max(6, Math.min(97, Math.round(risk)));
  const level = risk >= 65 ? "High" : risk >= 35 ? "Medium" : "Low";
  const window = risk >= 65 ? "30–45 min" : risk >= 35 ? "10–25 min" : "under 10 min";
  return { risk, level, window };
}
