import {
  getAllFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
} from "../services/flightService.js";
import {
  getFlightSeatsService,
  adminUpdateSeatService,
} from "../services/seatService.js";

export async function getFlights(req, res, next) {
  try {
    const result = await getAllFlights(req.query);
    res.json(result);
  } catch (error) {
    if (
      error.message.includes("Origin and destination") ||
      error.message.includes("Departure date") ||
      error.message.includes("Return date") ||
      error.message.includes("Passenger count")
    ) {
      return res.status(400).json({
        error: "BadRequest",
        message: error.message,
      });
    }
    next(error);
  }
}

export async function getFlight(req, res, next) {
  try {
    const flight = await getFlightById(req.params.id);
    if (!flight) {
      return res.status(404).json({ error: "NotFound", message: "Flight not found" });
    }
    res.json(flight);
  } catch (error) {
    next(error);
  }
}

export async function getFlightSeatsHandler(req, res, next) {
  try {
    const seats = await getFlightSeatsService(req.params.id);
    res.json({
      flightId: req.params.id,
      seats,
      totalSeats: seats.length,
      availableSeats: seats.filter((s) => !s.isBooked && s.isAvailable).length,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateFlightSeatsHandler(req, res, next) {
  try {
    const { id: flightId, seatNumber } = req.params;
    const seat = await adminUpdateSeatService(flightId, seatNumber, req.body);
    if (!seat) {
      return res.status(404).json({ error: "NotFound", message: "Seat not found" });
    }
    res.json(seat);
  } catch (error) {
    next(error);
  }
}

export async function createFlightHandler(req, res, next) {
  try {
    const flight = await createFlight(req.body);
    res.status(201).json(flight);
  } catch (error) {
    next(error);
  }
}

export async function updateFlightHandler(req, res, next) {
  try {
    const flight = await updateFlight(req.params.id, req.body);
    if (!flight) {
      return res.status(404).json({ error: "NotFound", message: "Flight not found" });
    }
    res.json(flight);
  } catch (error) {
    next(error);
  }
}

export async function deleteFlightHandler(req, res, next) {
  try {
    const deleted = await deleteFlight(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "NotFound", message: "Flight not found" });
    }
    res.json({ message: "Flight deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export async function getFlightStatusHandler(req, res, next) {
  try {
    const { flightNumber, date } = req.query;
    
    if (!flightNumber) {
      return res.status(400).json({
        error: "BadRequest",
        message: "Flight number is required"
      });
    }

    const { getFlightByNumberAndDate } = await import("../services/flightService.js");
    const flight = await getFlightByNumberAndDate(flightNumber, date);
    
    if (!flight) {
      return res.status(404).json({
        error: "NotFound",
        message: "Flight not found"
      });
    }

    res.json({
      flight,
      dataSource: flight.dataSourceLabel || "Demo Flight Schedule (Simulated Airline Data)",
      lastUpdated: flight.updatedAt || new Date().toISOString(),
      isLive: !flight.isDemoFlight
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecommendationsHandler(req, res, next) {
  try {
    const { sortBy = "value", from, to, date, limit = 6 } = req.query;
    
    const { getFlightRecommendations } = await import("../services/flightService.js");
    const recommendations = await getFlightRecommendations({
      sortBy,
      from,
      to,
      date,
      limit: Number(limit)
    });
    
    res.json(recommendations);
  } catch (error) {
    next(error);
  }
}
