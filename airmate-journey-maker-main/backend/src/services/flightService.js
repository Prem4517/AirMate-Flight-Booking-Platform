import { Flight } from "../models/Flight.js";
import { logger } from "../utils/logger.js";
import { isDBConnected } from "../config/db.js";

function makeFareBreakdown(price) {
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

const defaultCabinClasses = [
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
];

const initialFlights = [
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
  {
    id: "f-8",
    airline: "AirMate Connect",
    flightNumber: "AM-102",
    aircraft: "ATR 72-600",
    from: "Hyderabad",
    fromCode: "HYD",
    fromAirport: "Rajiv Gandhi International Airport",
    fromTerminal: "T1",
    to: "Vijayawada",
    toCode: "VGA",
    toAirport: "Vijayawada International Airport",
    toTerminal: "T1",
    departure: "09:30",
    arrival: "10:30",
    duration: "1h 00m",
    durationMins: 60,
    stops: 0,
    stopDetails: [],
    price: 2750,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(2750),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 72,
    seatsBooked: 58,
    seatsAvailable: 14,
    status: "On Time",
    gate: "A2",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-9",
    airline: "AirMate Express",
    flightNumber: "AM-405",
    aircraft: "Airbus A320neo",
    from: "Mumbai",
    fromCode: "BOM",
    fromAirport: "Chhatrapati Shivaji Maharaj International Airport",
    fromTerminal: "T2",
    to: "Goa",
    toCode: "GOI",
    toAirport: "Dabolim International Airport",
    toTerminal: "T1",
    departure: "11:15",
    arrival: "12:25",
    duration: "1h 10m",
    durationMins: 70,
    stops: 0,
    stopDetails: [],
    price: 3200,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(3200),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 135,
    seatsAvailable: 45,
    status: "On Time",
    gate: "4B",
    terminal: "T2",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-10",
    airline: "AirMate Express",
    flightNumber: "AM-709",
    aircraft: "Boeing 737 MAX 8",
    from: "Chennai",
    fromCode: "MAA",
    fromAirport: "Chennai International Airport",
    fromTerminal: "T1",
    to: "Delhi",
    toCode: "DEL",
    toAirport: "Indira Gandhi International Airport",
    toTerminal: "T3",
    departure: "14:00",
    arrival: "16:45",
    duration: "2h 45m",
    durationMins: 165,
    stops: 0,
    stopDetails: [],
    price: 5400,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(5400),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 189,
    seatsBooked: 140,
    seatsAvailable: 49,
    status: "On Time",
    gate: "09",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-11",
    airline: "Vistara",
    flightNumber: "UK-812",
    aircraft: "Airbus A321neo",
    from: "Bangalore",
    fromCode: "BLR",
    fromAirport: "Kempegowda International Airport",
    fromTerminal: "T2",
    to: "Delhi",
    toCode: "DEL",
    toAirport: "Indira Gandhi International Airport",
    toTerminal: "T3",
    departure: "07:00",
    arrival: "09:45",
    duration: "2h 45m",
    durationMins: 165,
    stops: 0,
    stopDetails: [],
    price: 5899,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(5899),
    checkinKg: 20,
    cabinKg: 7,
    baggage: "20 kg",
    seatsTotal: 188,
    seatsBooked: 172,
    seatsAvailable: 16,
    status: "On Time",
    gate: "C12",
    terminal: "T2",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-12",
    airline: "Akasa Air",
    flightNumber: "QP-1304",
    aircraft: "Boeing 737 MAX 8",
    from: "Bangalore",
    fromCode: "BLR",
    fromAirport: "Kempegowda International Airport",
    fromTerminal: "T1",
    to: "Chennai",
    toCode: "MAA",
    toAirport: "Chennai International Airport",
    toTerminal: "T1",
    departure: "08:25",
    arrival: "09:30",
    duration: "1h 05m",
    durationMins: 65,
    stops: 0,
    stopDetails: [],
    price: 2899,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(2899),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 189,
    seatsBooked: 160,
    seatsAvailable: 29,
    status: "On Time",
    gate: "E3",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-13",
    airline: "IndiGo",
    flightNumber: "6E-742",
    aircraft: "Airbus A320neo",
    from: "Chennai",
    fromCode: "MAA",
    fromAirport: "Chennai International Airport",
    fromTerminal: "T1",
    to: "Kolkata",
    toCode: "CCU",
    toAirport: "Netaji Subhash Chandra Bose International Airport",
    toTerminal: "T2",
    departure: "20:10",
    arrival: "22:35",
    duration: "2h 25m",
    durationMins: 145,
    stops: 0,
    stopDetails: [],
    price: 4599,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(4599),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 143,
    seatsAvailable: 37,
    status: "On Time",
    gate: "18",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-14",
    airline: "AirMate Express",
    flightNumber: "AM-520",
    aircraft: "Airbus A321neo",
    from: "Mumbai",
    fromCode: "BOM",
    fromAirport: "Chhatrapati Shivaji Maharaj International Airport",
    fromTerminal: "T2",
    to: "Bangalore",
    toCode: "BLR",
    toAirport: "Kempegowda International Airport",
    toTerminal: "T2",
    departure: "05:55",
    arrival: "07:35",
    duration: "1h 40m",
    durationMins: 100,
    stops: 0,
    stopDetails: [],
    price: 3899,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(3899),
    checkinKg: 20,
    cabinKg: 7,
    baggage: "20 kg",
    seatsTotal: 222,
    seatsBooked: 188,
    seatsAvailable: 34,
    status: "On Time",
    gate: "A9",
    terminal: "T2",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-15",
    airline: "Vistara",
    flightNumber: "UK-631",
    aircraft: "Airbus A320neo",
    from: "Hyderabad",
    fromCode: "HYD",
    fromAirport: "Rajiv Gandhi International Airport",
    fromTerminal: "T1",
    to: "Delhi",
    toCode: "DEL",
    toAirport: "Indira Gandhi International Airport",
    toTerminal: "T3",
    departure: "13:20",
    arrival: "15:35",
    duration: "2h 15m",
    durationMins: 135,
    stops: 0,
    stopDetails: [],
    price: 6199,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(6199),
    checkinKg: 25,
    cabinKg: 10,
    baggage: "25 kg",
    seatsTotal: 158,
    seatsBooked: 120,
    seatsAvailable: 38,
    status: "On Time",
    gate: "B2",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-16",
    airline: "IndiGo",
    flightNumber: "6E-904",
    aircraft: "Airbus A320neo",
    from: "Mumbai",
    fromCode: "BOM",
    fromAirport: "Chhatrapati Shivaji Maharaj International Airport",
    fromTerminal: "T1",
    to: "Delhi",
    toCode: "DEL",
    toAirport: "Indira Gandhi International Airport",
    toTerminal: "T2",
    departure: "21:30",
    arrival: "23:45",
    duration: "2h 15m",
    durationMins: 135,
    stops: 0,
    stopDetails: [],
    price: 4499,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(4499),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 165,
    seatsAvailable: 15,
    status: "On Time",
    gate: "B7",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Demo Flight Schedule (Simulated GDS Data)",
  },
  {
    id: "f-17",
    airline: "IndiGo",
    flightNumber: "6E-621",
    aircraft: "Airbus A320neo",
    from: "Delhi",
    fromCode: "DEL",
    fromAirport: "Indira Gandhi International Airport",
    fromTerminal: "T2",
    to: "Goa",
    toCode: "GOI",
    toAirport: "Dabolim International Airport",
    toTerminal: "T1",
    departure: "09:30",
    arrival: "12:05",
    duration: "2h 35m",
    durationMins: 155,
    stops: 0,
    stopDetails: [],
    price: 5499,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(5499),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 130,
    seatsAvailable: 50,
    status: "On Time",
    gate: "A4",
    terminal: "T2",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-18",
    airline: "Air India",
    flightNumber: "AI-448",
    aircraft: "Airbus A321neo",
    from: "Mumbai",
    fromCode: "BOM",
    fromAirport: "Chhatrapati Shivaji Maharaj International Airport",
    fromTerminal: "T2",
    to: "Jaipur",
    toCode: "JAI",
    toAirport: "Jaipur International Airport",
    toTerminal: "T2",
    departure: "10:15",
    arrival: "12:05",
    duration: "1h 50m",
    durationMins: 110,
    stops: 0,
    stopDetails: [],
    price: 4250,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(4250),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 186,
    seatsBooked: 142,
    seatsAvailable: 44,
    status: "Scheduled",
    gate: "C12",
    terminal: "T2",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-19",
    airline: "AirMate Connect",
    flightNumber: "AM-310",
    aircraft: "ATR 72-600",
    from: "Bangalore",
    fromCode: "BLR",
    fromAirport: "Kempegowda International Airport",
    fromTerminal: "T1",
    to: "Kochi",
    toCode: "COK",
    toAirport: "Cochin International Airport",
    toTerminal: "T1",
    departure: "08:45",
    arrival: "09:55",
    duration: "1h 10m",
    durationMins: 70,
    stops: 0,
    stopDetails: [],
    price: 2899,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(2899),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 72,
    seatsBooked: 48,
    seatsAvailable: 24,
    status: "On Time",
    gate: "D2",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-20",
    airline: "Air India",
    flightNumber: "AI-406",
    aircraft: "Airbus A320neo",
    from: "Delhi",
    fromCode: "DEL",
    fromAirport: "Indira Gandhi International Airport",
    fromTerminal: "T3",
    to: "Varanasi",
    toCode: "VNS",
    toAirport: "Lal Bahadur Shastri International Airport",
    toTerminal: "T1",
    departure: "07:00",
    arrival: "08:25",
    duration: "1h 25m",
    durationMins: 85,
    stops: 0,
    stopDetails: [],
    price: 3499,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(3499),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 110,
    seatsAvailable: 70,
    status: "Scheduled",
    gate: "B14",
    terminal: "T3",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-21",
    airline: "Vistara",
    flightNumber: "UK-920",
    aircraft: "Airbus A320neo",
    from: "Mumbai",
    fromCode: "BOM",
    fromAirport: "Chhatrapati Shivaji Maharaj International Airport",
    fromTerminal: "T2",
    to: "Ahmedabad",
    toCode: "AMD",
    toAirport: "Sardar Vallabhbhai Patel International Airport",
    toTerminal: "T1",
    departure: "14:20",
    arrival: "15:30",
    duration: "1h 10m",
    durationMins: 70,
    stops: 0,
    stopDetails: [],
    price: 3199,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(3199),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 164,
    seatsBooked: 120,
    seatsAvailable: 44,
    status: "On Time",
    gate: "A8",
    terminal: "T2",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-22",
    airline: "Akasa Air",
    flightNumber: "QP-1302",
    aircraft: "Boeing 737 MAX 8",
    from: "Bangalore",
    fromCode: "BLR",
    fromAirport: "Kempegowda International Airport",
    fromTerminal: "T1",
    to: "Pune",
    toCode: "PNQ",
    toAirport: "Pune International Airport",
    toTerminal: "T1",
    departure: "11:15",
    arrival: "12:40",
    duration: "1h 25m",
    durationMins: 85,
    stops: 0,
    stopDetails: [],
    price: 3750,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(3750),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 189,
    seatsBooked: 135,
    seatsAvailable: 54,
    status: "Scheduled",
    gate: "12",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-23",
    airline: "SpiceJet",
    flightNumber: "SG-8114",
    aircraft: "Boeing 737-800",
    from: "Delhi",
    fromCode: "DEL",
    fromAirport: "Indira Gandhi International Airport",
    fromTerminal: "T1",
    to: "Srinagar",
    toCode: "SXR",
    toAirport: "Sheikh ul-Alam International Airport",
    toTerminal: "T1",
    departure: "08:30",
    arrival: "10:05",
    duration: "1h 35m",
    durationMins: 95,
    stops: 0,
    stopDetails: [],
    price: 4899,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(4899),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 189,
    seatsBooked: 150,
    seatsAvailable: 39,
    status: "On Time",
    gate: "T1-06",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-24",
    airline: "AirMate Express",
    flightNumber: "AM-705",
    aircraft: "Airbus A320neo",
    from: "Hyderabad",
    fromCode: "HYD",
    fromAirport: "Rajiv Gandhi International Airport",
    fromTerminal: "T1",
    to: "Goa",
    toCode: "GOI",
    toAirport: "Dabolim International Airport",
    toTerminal: "T1",
    departure: "12:10",
    arrival: "13:35",
    duration: "1h 25m",
    durationMins: 85,
    stops: 0,
    stopDetails: [],
    price: 3699,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(3699),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 125,
    seatsAvailable: 55,
    status: "Scheduled",
    gate: "G11",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-25",
    airline: "SpiceJet",
    flightNumber: "SG-3211",
    aircraft: "De Havilland Q400",
    from: "Kolkata",
    fromCode: "CCU",
    fromAirport: "Netaji Subhash Chandra Bose International Airport",
    fromTerminal: "T2",
    to: "Bagdogra",
    toCode: "IXB",
    toAirport: "Bagdogra International Airport",
    toTerminal: "T1",
    departure: "09:15",
    arrival: "10:25",
    duration: "1h 10m",
    durationMins: 70,
    stops: 0,
    stopDetails: [],
    price: 2699,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(2699),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 78,
    seatsBooked: 52,
    seatsAvailable: 26,
    status: "On Time",
    gate: "18",
    terminal: "T2",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-26",
    airline: "IndiGo",
    flightNumber: "6E-7201",
    aircraft: "ATR 72-600",
    from: "Chennai",
    fromCode: "MAA",
    fromAirport: "Chennai International Airport",
    fromTerminal: "T1",
    to: "Coimbatore",
    toCode: "CJB",
    toAirport: "Coimbatore International Airport",
    toTerminal: "T1",
    departure: "06:45",
    arrival: "07:55",
    duration: "1h 10m",
    durationMins: 70,
    stops: 0,
    stopDetails: [],
    price: 2450,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(2450),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 72,
    seatsBooked: 60,
    seatsAvailable: 12,
    status: "On Time",
    gate: "C3",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-27",
    airline: "Air India",
    flightNumber: "AI-463",
    aircraft: "Airbus A320neo",
    from: "Delhi",
    fromCode: "DEL",
    fromAirport: "Indira Gandhi International Airport",
    fromTerminal: "T3",
    to: "Chandigarh",
    toCode: "IXC",
    toAirport: "Shaheed Bhagat Singh International Airport",
    toTerminal: "T1",
    departure: "16:00",
    arrival: "17:00",
    duration: "1h 00m",
    durationMins: 60,
    stops: 0,
    stopDetails: [],
    price: 2299,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(2299),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 130,
    seatsAvailable: 50,
    status: "Scheduled",
    gate: "19",
    terminal: "T3",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-28",
    airline: "IndiGo",
    flightNumber: "6E-512",
    aircraft: "Airbus A321neo",
    from: "Mumbai",
    fromCode: "BOM",
    fromAirport: "Chhatrapati Shivaji Maharaj International Airport",
    fromTerminal: "T1",
    to: "Lucknow",
    toCode: "LKO",
    toAirport: "Chaudhary Charan Singh International Airport",
    toTerminal: "T2",
    departure: "17:45",
    arrival: "20:00",
    duration: "2h 15m",
    durationMins: 135,
    stops: 0,
    stopDetails: [],
    price: 4499,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(4499),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 222,
    seatsBooked: 180,
    seatsAvailable: 42,
    status: "On Time",
    gate: "T1-4",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-29",
    airline: "Air India",
    flightNumber: "AI-453",
    aircraft: "Airbus A320neo",
    from: "Delhi",
    fromCode: "DEL",
    fromAirport: "Indira Gandhi International Airport",
    fromTerminal: "T3",
    to: "Amritsar",
    toCode: "ATQ",
    toAirport: "Sri Guru Ram Dass Jee International Airport",
    toTerminal: "T1",
    departure: "11:00",
    arrival: "12:10",
    duration: "1h 10m",
    durationMins: 70,
    stops: 0,
    stopDetails: [],
    price: 3150,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(3150),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 140,
    seatsAvailable: 40,
    status: "Scheduled",
    gate: "26",
    terminal: "T3",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-30",
    airline: "AirMate Connect",
    flightNumber: "AM-212",
    aircraft: "ATR 72-600",
    from: "Hyderabad",
    fromCode: "HYD",
    fromAirport: "Rajiv Gandhi International Airport",
    fromTerminal: "T1",
    to: "Visakhapatnam",
    toCode: "VTZ",
    toAirport: "Visakhapatnam International Airport",
    toTerminal: "T1",
    departure: "15:00",
    arrival: "16:15",
    duration: "1h 15m",
    durationMins: 75,
    stops: 0,
    stopDetails: [],
    price: 2750,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(2750),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 72,
    seatsBooked: 50,
    seatsAvailable: 22,
    status: "On Time",
    gate: "D5",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-31",
    airline: "AirMate Connect",
    flightNumber: "AM-118",
    aircraft: "ATR 72-600",
    from: "Bangalore",
    fromCode: "BLR",
    fromAirport: "Kempegowda International Airport",
    fromTerminal: "T1",
    to: "Vijayawada",
    toCode: "VGA",
    toAirport: "Vijayawada International Airport",
    toTerminal: "T1",
    departure: "16:30",
    arrival: "17:45",
    duration: "1h 15m",
    durationMins: 75,
    stops: 0,
    stopDetails: [],
    price: 2950,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(2950),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 72,
    seatsBooked: 45,
    seatsAvailable: 27,
    status: "Scheduled",
    gate: "D8",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-32",
    airline: "Air India",
    flightNumber: "AI-995",
    aircraft: "Boeing 787-8 Dreamliner",
    from: "Delhi",
    fromCode: "DEL",
    fromAirport: "Indira Gandhi International Airport",
    fromTerminal: "T3",
    to: "Dubai",
    toCode: "DXB",
    toAirport: "Dubai International Airport",
    toTerminal: "T1",
    departure: "20:30",
    arrival: "23:00",
    duration: "4h 00m",
    durationMins: 240,
    stops: 0,
    stopDetails: [],
    price: 12999,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(12999),
    checkinKg: 25,
    cabinKg: 8,
    baggage: "25 kg",
    seatsTotal: 256,
    seatsBooked: 210,
    seatsAvailable: 46,
    status: "Scheduled",
    gate: "15",
    terminal: "T3",
    isDemoFlight: true,
    dataSourceLabel: "International Flight Schedule",
  },
  {
    id: "f-33",
    airline: "Air India",
    flightNumber: "AI-549",
    aircraft: "Airbus A320neo",
    from: "Chennai",
    fromCode: "MAA",
    fromAirport: "Chennai International Airport",
    fromTerminal: "T1",
    to: "Port Blair",
    toCode: "IXZ",
    toAirport: "Veer Savarkar International Airport",
    toTerminal: "T1",
    departure: "05:40",
    arrival: "07:50",
    duration: "2h 10m",
    durationMins: 130,
    stops: 0,
    stopDetails: [],
    price: 6850,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(6850),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 155,
    seatsAvailable: 25,
    status: "On Time",
    gate: "B3",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-34",
    airline: "IndiGo",
    flightNumber: "6E-244",
    aircraft: "Airbus A320neo",
    from: "Kolkata",
    fromCode: "CCU",
    fromAirport: "Netaji Subhash Chandra Bose International Airport",
    fromTerminal: "T2",
    to: "Guwahati",
    toCode: "GAU",
    toAirport: "Lokpriya Gopinath Bordoloi International Airport",
    toTerminal: "T1",
    departure: "13:20",
    arrival: "14:35",
    duration: "1h 15m",
    durationMins: 75,
    stops: 0,
    stopDetails: [],
    price: 2899,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(2899),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 138,
    seatsAvailable: 42,
    status: "Scheduled",
    gate: "22",
    terminal: "T2",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-35",
    airline: "IndiGo",
    flightNumber: "6E-481",
    aircraft: "ATR 72-600",
    from: "Bangalore",
    fromCode: "BLR",
    fromAirport: "Kempegowda International Airport",
    fromTerminal: "T1",
    to: "Mangalore",
    toCode: "IXE",
    toAirport: "Mangaluru International Airport",
    toTerminal: "T1",
    departure: "07:30",
    arrival: "08:35",
    duration: "1h 05m",
    durationMins: 65,
    stops: 0,
    stopDetails: [],
    price: 2350,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(2350),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 72,
    seatsBooked: 55,
    seatsAvailable: 17,
    status: "On Time",
    gate: "D1",
    terminal: "T1",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
  {
    id: "f-36",
    airline: "Air India",
    flightNumber: "AI-962",
    aircraft: "Airbus A320neo",
    from: "Delhi",
    fromCode: "DEL",
    fromAirport: "Indira Gandhi International Airport",
    fromTerminal: "T3",
    to: "Dehradun",
    toCode: "DED",
    toAirport: "Dehradun Airport",
    toTerminal: "T1",
    departure: "14:15",
    arrival: "15:10",
    duration: "0h 55m",
    durationMins: 55,
    stops: 0,
    stopDetails: [],
    price: 2199,
    cabinClass: "Economy",
    cabinClasses: defaultCabinClasses,
    fareBreakdown: makeFareBreakdown(2199),
    checkinKg: 15,
    cabinKg: 7,
    baggage: "15 kg",
    seatsTotal: 180,
    seatsBooked: 128,
    seatsAvailable: 52,
    status: "Scheduled",
    gate: "11",
    terminal: "T3",
    isDemoFlight: true,
    dataSourceLabel: "Commercial Flight Schedule",
  },
];

export async function seedFlightsIfEmpty() {
  if (!isDBConnected()) {
    logger.info(`Running in in-memory mode with ${initialFlights.length} preloaded flights`);
    return;
  }
  try {
    let insertedCount = 0;
    for (const flight of initialFlights) {
      const res = await Flight.updateOne(
        { id: flight.id },
        { $setOnInsert: flight },
        { upsert: true }
      );
      if (res.upsertedCount > 0) {
        insertedCount += res.upsertedCount;
      }
    }
    const total = await Flight.countDocuments();
    if (insertedCount > 0) {
      logger.info(`Successfully seeded ${insertedCount} new flights. Total flights in MongoDB: ${total}`);
    } else {
      logger.info(`MongoDB flight schedule is up to date (${total} flights total)`);
    }
  } catch (error) {
    logger.error(`Error seeding flights: ${error.message}`);
  }
}

/**
 * Validates query inputs and searches flights with filters, sorting & pagination
 */
export async function getAllFlights(filters = {}) {
  const from = (filters.from || "").trim();
  const to = (filters.to || "").trim();
  const departDate = (filters.departDate || filters.date || "").trim();
  const returnDate = (filters.returnDate || "").trim();
  const passengers = filters.passengers ? Number(filters.passengers) : 1;
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 6));
  const sortBy = (filters.sortBy || "cheapest").toLowerCase();

  // Validation 1: Origin and destination must differ
  if (from && to && from.toLowerCase() === to.toLowerCase()) {
    throw new Error("Origin and destination airports must be different.");
  }

  // Validation 2: Departure date cannot be in the past
  if (departDate) {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(departDate)) {
      throw new Error("Departure date format must be YYYY-MM-DD.");
    }
    if (departDate < todayStr) {
      throw new Error("Departure date cannot be in the past.");
    }
  }

  // Validation 3: Return date cannot be earlier than departure date
  if (returnDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
      throw new Error("Return date format must be YYYY-MM-DD.");
    }
    if (departDate && returnDate < departDate) {
      throw new Error("Return date cannot be earlier than departure date.");
    }
  }

  // Validation 4: Passenger count must be 1-9
  if (passengers < 1 || passengers > 9 || isNaN(passengers)) {
    throw new Error("Passenger count must be between 1 and 9.");
  }

  // Fetch candidate flights
  let flights = [];
  if (isDBConnected()) {
    const mongoQuery = {};
    if (from) {
      mongoQuery.$or = [
        { from: { $regex: new RegExp(`^${from}$`, "i") } },
        { fromCode: { $regex: new RegExp(`^${from}$`, "i") } },
      ];
    }
    if (to) {
      const toCond = [
        { to: { $regex: new RegExp(`^${to}$`, "i") } },
        { toCode: { $regex: new RegExp(`^${to}$`, "i") } },
      ];
      if (mongoQuery.$or) {
        mongoQuery.$and = [{ $or: mongoQuery.$or }, { $or: toCond }];
        delete mongoQuery.$or;
      } else {
        mongoQuery.$or = toCond;
      }
    }
    flights = await Flight.find(mongoQuery).lean();
  } else {
    flights = [...initialFlights];
  }

  // Apply in-memory filtering (covers both MongoDB results and fallback store)
  let result = flights.filter((f) => {
    // Origin filter
    if (from) {
      const fromLower = from.toLowerCase();
      const match =
        f.from.toLowerCase() === fromLower ||
        f.fromCode.toLowerCase() === fromLower;
      if (!match) return false;
    }

    // Destination filter
    if (to) {
      const toLower = to.toLowerCase();
      const match =
        f.to.toLowerCase() === toLower ||
        f.toCode.toLowerCase() === toLower;
      if (!match) return false;
    }

    // Maximum price filter
    if (filters.maxPrice) {
      const maxP = Number(filters.maxPrice);
      if (!isNaN(maxP) && f.price > maxP) return false;
    }

    // Maximum duration filter
    if (filters.maxDuration) {
      const maxD = Number(filters.maxDuration);
      if (!isNaN(maxD) && f.durationMins > maxD) return false;
    }

    // Airline filter
    if (filters.airline && filters.airline !== "All") {
      const selectedAirlines = filters.airline.split(",").map((a) => a.trim().toLowerCase());
      if (!selectedAirlines.includes(f.airline.toLowerCase())) {
        return false;
      }
    }

    // Stops filter
    if (filters.stops !== undefined && filters.stops !== "all" && filters.stops !== "") {
      const stopsVal = String(filters.stops);
      if (stopsVal === "0" && f.stops !== 0) return false;
      if (stopsVal === "1" && f.stops !== 1) return false;
      if ((stopsVal === "2" || stopsVal === "2+") && f.stops < 2) return false;
    }

    // Departure window filter
    if (filters.departureWindow && filters.departureWindow !== "all") {
      const hour = parseInt(f.departure.split(":")[0], 10);
      if (filters.departureWindow === "morning" && (hour < 4 || hour >= 12)) return false;
      if (filters.departureWindow === "afternoon" && (hour < 12 || hour >= 18)) return false;
      if (filters.departureWindow === "evening" && (hour < 18 && hour >= 4)) return false;
    }

    return true;
  });

  // Apply sorting
  if (sortBy === "cheapest") {
    result.sort((a, b) => a.price - b.price);
  } else if (sortBy === "fastest") {
    result.sort((a, b) => a.durationMins - b.durationMins);
  } else if (sortBy === "earliest") {
    result.sort((a, b) => a.departure.localeCompare(b.departure));
  } else {
    // Default score / price
    result.sort((a, b) => a.price - b.price);
  }

  // Calculate pagination
  const total = result.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedFlights = result.slice(startIndex, startIndex + limit);

  return {
    flights: paginatedFlights,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    },
    appliedFilters: {
      from,
      to,
      departDate,
      returnDate,
      passengers,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : null,
      maxDuration: filters.maxDuration ? Number(filters.maxDuration) : null,
      airline: filters.airline || "All",
      stops: filters.stops || "all",
      departureWindow: filters.departureWindow || "all",
      sortBy,
    },
    meta: {
      isSimulated: true,
      notice: "Demo Flight Schedule: Availability and schedules are realistic mock data for demonstration. Live GDS feed is currently inactive.",
    },
  };
}

export async function getFlightById(id) {
  if (!isDBConnected()) {
    return initialFlights.find((f) => f.id === id || f._id === id) || null;
  }

  const isValidObjectId = id.match(/^[0-9a-fA-F]{24}$/);
  const conditions = [{ id }];
  if (isValidObjectId) {
    conditions.push({ _id: id });
  }
  return await Flight.findOne({ $or: conditions }).lean();
}

export async function getFlightByNumberAndDate(flightNumber, date) {
  if (!isDBConnected()) {
    const flight = initialFlights.find(
      (f) => f.flightNumber.toLowerCase() === flightNumber.toLowerCase()
    );
    return flight || null;
  }

  const flight = await Flight.findOne({
    flightNumber: { $regex: new RegExp(`^${flightNumber}$`, "i") }
  }).lean();
  
  return flight || null;
}

export async function getFlightRecommendations({ sortBy = "value", from, to, date, limit = 6 }) {
  let flights = [];
  
  if (isDBConnected()) {
    flights = await Flight.find().lean();
  } else {
    flights = [...initialFlights];
  }

  // Apply optional filters
  if (from) {
    flights = flights.filter(f => 
      f.from.toLowerCase() === from.toLowerCase() || 
      f.fromCode.toLowerCase() === from.toLowerCase()
    );
  }
  
  if (to) {
    flights = flights.filter(f => 
      f.to.toLowerCase() === to.toLowerCase() || 
      f.toCode.toLowerCase() === to.toLowerCase()
    );
  }

  // Calculate min and max for normalization
  const minPrice = Math.min(...flights.map(f => f.price));
  const maxPrice = Math.max(...flights.map(f => f.price));
  const minDuration = Math.min(...flights.map(f => f.durationMins));
  const maxDuration = Math.max(...flights.map(f => f.durationMins));

  // Add scores and sort
  const scoredFlights = flights.map(flight => {
    const normalizedPrice = maxPrice > minPrice 
      ? (flight.price - minPrice) / (maxPrice - minPrice) 
      : 0;
    const normalizedDuration = maxDuration > minDuration 
      ? (flight.durationMins - minDuration) / (maxDuration - minDuration) 
      : 0;
    
    // Value score: 70% weight on price, 30% on duration (lower is better)
    const valueScore = (1 - normalizedPrice) * 0.7 + (1 - normalizedDuration) * 0.3;
    
    return {
      ...flight,
      valueScore,
      recommendationReason: getRecommendationReason(sortBy, flight, normalizedPrice, normalizedDuration, valueScore)
    };
  });

  // Sort based on sortBy parameter
  switch (sortBy.toLowerCase()) {
    case "price":
    case "cheapest":
      scoredFlights.sort((a, b) => a.price - b.price);
      break;
    case "duration":
    case "fastest":
      scoredFlights.sort((a, b) => a.durationMins - b.durationMins);
      break;
    case "morning":
      scoredFlights.sort((a, b) => {
        const hourA = parseInt(a.departure.split(":")[0], 10);
        const hourB = parseInt(b.departure.split(":")[0], 10);
        return hourA - hourB;
      });
      break;
    case "value":
    default:
      scoredFlights.sort((a, b) => b.valueScore - a.valueScore);
      break;
  }

  // Return limited results
  return {
    flights: scoredFlights.slice(0, limit),
    sortBy,
    total: scoredFlights.length,
    meta: {
      isSimulated: true,
      notice: "Recommendations based on current flight inventory"
    }
  };
}

function getRecommendationReason(sortBy, flight, normalizedPrice, normalizedDuration, valueScore) {
  const hour = parseInt(flight.departure.split(":")[0], 10);
  
  switch (sortBy.toLowerCase()) {
    case "price":
    case "cheapest":
      return "Lowest available fare";
    case "duration":
    case "fastest":
      return "Shortest journey time";
    case "morning":
      return hour < 12 ? "Morning departure" : "Earliest available";
    case "value":
    default:
      if (valueScore > 0.8) return "Best price-duration balance";
      if (normalizedPrice < 0.3) return "Great value for money";
      if (normalizedDuration < 0.3) return "Quick and efficient";
      return "Good overall option";
  }
}

export async function createFlight(flightData) {
  if (!flightData.flightNumber || !flightData.airline) {
    throw new Error("Flight number and airline are required");
  }
  if (!flightData.from || !flightData.to) {
    throw new Error("Origin and destination cities are required");
  }
  if (!flightData.departure || !flightData.arrival) {
    throw new Error("Departure and arrival times are required");
  }

  const price = Math.max(500, Number(flightData.price) || 3000);
  const seatsTotal = Math.max(1, Number(flightData.seatsTotal) || 180);
  const seatsBooked = Math.max(0, Number(flightData.seatsBooked) || 0);
  const seatsAvailable = Math.max(0, seatsTotal - seatsBooked);

  const fromCode = (flightData.fromCode || flightData.from.slice(0, 3)).toUpperCase();
  const toCode = (flightData.toCode || flightData.to.slice(0, 3)).toUpperCase();

  const newFlight = {
    id: flightData.id || "fl_" + Date.now(),
    flightNumber: flightData.flightNumber.toUpperCase().trim(),
    airline: flightData.airline.trim(),
    aircraft: flightData.aircraft || "Airbus A320neo",
    from: flightData.from.trim(),
    fromCode,
    fromAirport: flightData.fromAirport || `${flightData.from} Airport`,
    fromTerminal: flightData.fromTerminal || "T1",
    to: flightData.to.trim(),
    toCode,
    toAirport: flightData.toAirport || `${flightData.to} Airport`,
    toTerminal: flightData.toTerminal || "T2",
    date: flightData.date || new Date().toISOString().slice(0, 10),
    departure: flightData.departure,
    arrival: flightData.arrival,
    duration: flightData.duration || "2h 00m",
    durationMins: Number(flightData.durationMins) || 120,
    price,
    seatsTotal,
    seatsBooked,
    seatsAvailable,
    status: flightData.status || "Scheduled",
    gate: flightData.gate || "A1",
    terminal: flightData.terminal || flightData.fromTerminal || "T1",
    fareBreakdown: makeFareBreakdown(price),
    cabinClasses: defaultCabinClasses,
    checkinKg: Number(flightData.checkinKg) || 15,
    cabinKg: Number(flightData.cabinKg) || 7,
    baggage: `${flightData.checkinKg || 15} kg`,
    isDemoFlight: true,
    dataSourceLabel: "AirMate Flight Schedule (Live Operations Data)",
    ...flightData,
    price,
    seatsTotal,
    seatsBooked,
    seatsAvailable,
  };

  if (!isDBConnected()) {
    initialFlights.unshift(newFlight);
    return newFlight;
  }

  return await Flight.create(newFlight);
}

export async function updateFlight(id, updateData) {
  const existing = await getFlightById(id);
  if (!existing) throw new Error("Flight not found");

  if (updateData.seatsTotal !== undefined) {
    const newTotal = Number(updateData.seatsTotal);
    const booked = existing.seatsBooked || 0;
    if (newTotal < booked) {
      throw new Error(`Cannot decrease total seat capacity (${newTotal}) below booked seats (${booked})`);
    }
    updateData.seatsAvailable = newTotal - booked;
  }

  if (updateData.price) {
    updateData.fareBreakdown = makeFareBreakdown(Number(updateData.price));
  }

  if (!isDBConnected()) {
    const idx = initialFlights.findIndex((f) => f.id === id || f._id === id);
    if (idx === -1) return null;
    initialFlights[idx] = { ...initialFlights[idx], ...updateData };
    return initialFlights[idx];
  }

  const isValidObjectId = id.match(/^[0-9a-fA-F]{24}$/);
  const conditions = [{ id }];
  if (isValidObjectId) conditions.push({ _id: id });
  return await Flight.findOneAndUpdate({ $or: conditions }, updateData, { new: true }).lean();
}

/**
 * Reschedule departure/arrival times for an existing flight
 */
export async function rescheduleFlight(id, { date, departure, arrival, durationMins, reason = "" }) {
  if (!departure || !arrival) {
    throw new Error("Both departure and arrival times are required to reschedule");
  }

  const update = {
    departure,
    arrival,
    status: "Delayed",
    rescheduledReason: reason || "Operational schedule adjustment",
  };
  if (date) update.date = date;
  if (durationMins) update.durationMins = Number(durationMins);

  return await updateFlight(id, update);
}

/**
 * Update flight status (e.g., Scheduled, On Time, Delayed, Cancelled, Departed, Arrived)
 */
export async function updateFlightStatus(id, { status, delayMins = 0, reason = "" }) {
  const allowed = ["Scheduled", "On Time", "Delayed", "Departed", "Arrived", "Cancelled"];
  if (!allowed.includes(status)) {
    throw new Error(`Invalid status: must be one of ${allowed.join(", ")}`);
  }

  const update = { status };
  if (status === "Delayed") {
    update.delayMins = Number(delayMins) || 30;
    update.statusDetails = reason || `Delayed by ${update.delayMins} mins due to operational requirements`;
  } else if (status === "Cancelled") {
    update.statusDetails = reason || "Flight cancelled by flight operations control";
  }

  return await updateFlight(id, update);
}

/**
 * Cancel a flight while preserving existing booking records
 */
export async function cancelFlight(id, { reason = "Operational cancellation" } = {}) {
  return await updateFlightStatus(id, { status: "Cancelled", reason });
}

/**
 * Safe delete: verifies whether bookings exist before allowing deletion
 */
export async function safeDeleteFlight(id) {
  // Check in-memory bookings or MongoDB
  const flight = await getFlightById(id);
  if (!flight) return false;

  // Check if flight has active bookings
  let hasBookings = false;
  if (!isDBConnected()) {
    const { inMemoryBookings } = await import("./bookingService.js");
    hasBookings = inMemoryBookings.some((b) => b.flightId === id || b.flight?.flightNumber === flight.flightNumber);
  } else {
    const { Booking } = await import("../models/Booking.js");
    const count = await Booking.countDocuments({
      $or: [{ flightId: id }, { "flight.flightNumber": flight.flightNumber }],
    });
    hasBookings = count > 0;
  }

  if (hasBookings) {
    throw new Error(
      `Cannot delete flight ${flight.flightNumber}: active passenger bookings exist for this flight. Please cancel the flight instead to preserve passenger records and booking audits.`
    );
  }

  return await deleteFlight(id);
}

export async function deleteFlight(id) {
  if (!isDBConnected()) {
    const idx = initialFlights.findIndex((f) => f.id === id || f._id === id);
    if (idx === -1) return false;
    initialFlights.splice(idx, 1);
    return true;
  }

  const isValidObjectId = id.match(/^[0-9a-fA-F]{24}$/);
  const conditions = [{ id }];
  if (isValidObjectId) conditions.push({ _id: id });
  const res = await Flight.findOneAndDelete({ $or: conditions });
  return !!res;
}

/**
 * Admin search & paginate flights
 */
export async function adminSearchFlights({
  query = "",
  status = "all",
  airline = "all",
  page = 1,
  limit = 20,
} = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  if (isDBConnected()) {
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (airline && airline !== "all") filter.airline = airline;
    if (query) {
      filter.$or = [
        { flightNumber: { $regex: query, $options: "i" } },
        { airline: { $regex: query, $options: "i" } },
        { from: { $regex: query, $options: "i" } },
        { to: { $regex: query, $options: "i" } },
        { fromCode: { $regex: query, $options: "i" } },
        { toCode: { $regex: query, $options: "i" } },
        { aircraft: { $regex: query, $options: "i" } },
      ];
    }

    const [flights, total] = await Promise.all([
      Flight.find(filter)
        .sort({ departure: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Flight.countDocuments(filter),
    ]);

    return {
      flights,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  } else {
    let list = [...initialFlights];
    if (status && status !== "all") {
      list = list.filter((f) => f.status === status);
    }
    if (airline && airline !== "all") {
      list = list.filter((f) => f.airline === airline);
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (f) =>
          f.flightNumber?.toLowerCase().includes(q) ||
          f.airline?.toLowerCase().includes(q) ||
          f.from?.toLowerCase().includes(q) ||
          f.to?.toLowerCase().includes(q) ||
          f.fromCode?.toLowerCase().includes(q) ||
          f.toCode?.toLowerCase().includes(q) ||
          f.aircraft?.toLowerCase().includes(q)
      );
    }

    const total = list.length;
    const paginated = list.slice(skip, skip + limitNum);

    return {
      flights: paginated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  }
}

