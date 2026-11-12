import {
  getUserProfileService,
  updateUserProfileService,
  changePasswordService,
  getSavedPassengersService,
  addSavedPassengerService,
  updateSavedPassengerService,
  deleteSavedPassengerService,
  getSavedFlightsService,
  saveFlightService,
  removeSavedFlightService,
  togglePriceAlertService,
  getUserNotificationsService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService,
  getUserSupportTicketsService,
  createSupportTicketService,
  replySupportTicketService,
} from "../services/userService.js";
import { logger } from "../utils/logger.js";

// --- Profile ---
export async function getProfileHandler(req, res, next) {
  try {
    const profile = await getUserProfileService(req.user.id, req.user.email);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function updateProfileHandler(req, res, next) {
  try {
    const updated = await updateUserProfileService(req.user.id, req.user.email, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function changePasswordHandler(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await changePasswordService(req.user.id, req.user.email, {
      currentPassword,
      newPassword,
    });
    res.json(result);
  } catch (error) {
    if (error.message.includes("match") || error.message.includes("required") || error.message.includes("least 8")) {
      return res.status(400).json({ error: "BadRequest", message: error.message });
    }
    next(error);
  }
}

// --- Saved Passengers ---
export async function getPassengersHandler(req, res, next) {
  try {
    const list = await getSavedPassengersService(req.user.id, req.user.email);
    res.json(list);
  } catch (error) {
    next(error);
  }
}

export async function addPassengerHandler(req, res, next) {
  try {
    const pax = await addSavedPassengerService(req.user.id, req.user.email, req.body);
    res.status(201).json(pax);
  } catch (error) {
    if (error.message.includes("required")) {
      return res.status(400).json({ error: "BadRequest", message: error.message });
    }
    next(error);
  }
}

export async function updatePassengerHandler(req, res, next) {
  try {
    const { id } = req.params;
    const pax = await updateSavedPassengerService(req.user.id, req.user.email, id, req.body);
    res.json(pax);
  } catch (error) {
    next(error);
  }
}

export async function deletePassengerHandler(req, res, next) {
  try {
    const { id } = req.params;
    const result = await deleteSavedPassengerService(req.user.id, req.user.email, id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// --- Saved Flights & Alerts ---
export async function getSavedFlightsHandler(req, res, next) {
  try {
    const list = await getSavedFlightsService(req.user.id, req.user.email);
    res.json(list);
  } catch (error) {
    next(error);
  }
}

export async function saveFlightHandler(req, res, next) {
  try {
    const saved = await saveFlightService(req.user.id, req.user.email, req.body);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
}

export async function removeSavedFlightHandler(req, res, next) {
  try {
    const { flightId } = req.params;
    const result = await removeSavedFlightService(req.user.id, req.user.email, flightId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function togglePriceAlertHandler(req, res, next) {
  try {
    const { flightId } = req.params;
    const updated = await togglePriceAlertService(req.user.id, req.user.email, flightId, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

// --- Notifications ---
export async function getNotificationsHandler(req, res, next) {
  try {
    const notifs = await getUserNotificationsService(req.user.id, req.user.email);
    res.json(notifs);
  } catch (error) {
    next(error);
  }
}

export async function markNotificationReadHandler(req, res, next) {
  try {
    const { id } = req.params;
    const result = await markNotificationAsReadService(req.user.id, req.user.email, id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsReadHandler(req, res, next) {
  try {
    const result = await markAllNotificationsAsReadService(req.user.id, req.user.email);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// --- Support Tickets ---
export async function getSupportTicketsHandler(req, res, next) {
  try {
    const tickets = await getUserSupportTicketsService(req.user.id, req.user.email);
    res.json(tickets);
  } catch (error) {
    next(error);
  }
}

export async function createSupportTicketHandler(req, res, next) {
  try {
    const ticket = await createSupportTicketService(
      req.user.id,
      req.user.email,
      req.user.name,
      req.body
    );
    res.status(201).json(ticket);
  } catch (error) {
    if (error.message.includes("required")) {
      return res.status(400).json({ error: "BadRequest", message: error.message });
    }
    next(error);
  }
}

export async function replySupportTicketHandler(req, res, next) {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const ticket = await replySupportTicketService(
      req.user.id,
      req.user.email,
      req.user.name,
      ticketId,
      message
    );
    res.json(ticket);
  } catch (error) {
    if (error.message.includes("empty")) {
      return res.status(400).json({ error: "BadRequest", message: error.message });
    }
    next(error);
  }
}
