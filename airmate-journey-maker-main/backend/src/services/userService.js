import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { isDBConnected } from "../config/db.js";
import { logger } from "../utils/logger.js";
import { inMemoryUsers, hashPassword, comparePassword } from "./authService.js";
import { inMemoryNotifications } from "./emailService.js";

// In-memory support tickets
export const inMemorySupportTickets = [];

/**
 * Helper to find user doc in Mongo or Map
 */
async function findUser(userId, email) {
  if (isDBConnected()) {
    if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
      const byId = await User.findById(userId);
      if (byId) return byId;
    }
    if (email) {
      return await User.findOne({ email: email.toLowerCase().trim() });
    }
    return null;
  }

  // In-memory lookup
  if (email && inMemoryUsers.has(email.toLowerCase().trim())) {
    return inMemoryUsers.get(email.toLowerCase().trim());
  }
  for (const u of inMemoryUsers.values()) {
    if (u.id === userId || u._id === userId) return u;
  }
  return null;
}

/**
 * 1. Profile Services
 */
export async function getUserProfileService(userId, email) {
  const user = await findUser(userId, email);
  if (!user) throw new Error("User not found");

  if (isDBConnected()) {
    return user.toSafeObject();
  }

  return {
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus,
    phone: user.phone || "",
    dateOfBirth: user.dateOfBirth || "",
    gender: user.gender || "",
    nationality: user.nationality || "Indian",
    passportNumber: user.passportNumber || "",
    passportExpiry: user.passportExpiry || "",
    frequentFlyerNumber: user.frequentFlyerNumber || "",
    address: user.address || {},
    emergencyContact: user.emergencyContact || {},
    preferences: user.preferences || { seat: "any", meal: "standard", currency: "INR" },
    savedPassengers: user.savedPassengers || [],
    savedFlights: user.savedFlights || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function updateUserProfileService(userId, email, updateData) {
  const user = await findUser(userId, email);
  if (!user) throw new Error("User not found");

  // Whitelisted fields only
  const allowed = [
    "name",
    "phone",
    "dateOfBirth",
    "gender",
    "nationality",
    "passportNumber",
    "passportExpiry",
    "frequentFlyerNumber",
    "address",
    "emergencyContact",
    "preferences",
  ];

  if (isDBConnected()) {
    for (const key of allowed) {
      if (updateData[key] !== undefined) {
        user[key] = updateData[key];
      }
    }
    await user.save();
    return user.toSafeObject();
  } else {
    for (const key of allowed) {
      if (updateData[key] !== undefined) {
        user[key] = updateData[key];
      }
    }
    user.updatedAt = new Date().toISOString();
    return {
      id: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      phone: user.phone || "",
      dateOfBirth: user.dateOfBirth || "",
      gender: user.gender || "",
      nationality: user.nationality || "Indian",
      passportNumber: user.passportNumber || "",
      passportExpiry: user.passportExpiry || "",
      frequentFlyerNumber: user.frequentFlyerNumber || "",
      address: user.address || {},
      emergencyContact: user.emergencyContact || {},
      preferences: user.preferences || { seat: "any", meal: "standard", currency: "INR" },
      savedPassengers: user.savedPassengers || [],
      savedFlights: user.savedFlights || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export async function changePasswordService(userId, email, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    throw new Error("Current password and new password are required");
  }
  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long");
  }

  const user = await findUser(userId, email);
  if (!user) throw new Error("User not found");

  const isMatch = await comparePassword(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new Error("Current password does not match");
  }

  const newHash = await hashPassword(newPassword);
  if (isDBConnected()) {
    user.passwordHash = newHash;
    await user.save();
  } else {
    user.passwordHash = newHash;
    user.updatedAt = new Date().toISOString();
  }

  return { success: true, message: "Password updated successfully" };
}

/**
 * 2. Saved Passengers Services
 */
export async function getSavedPassengersService(userId, email) {
  const profile = await getUserProfileService(userId, email);
  return profile.savedPassengers || [];
}

export async function addSavedPassengerService(userId, email, passengerData) {
  if (!passengerData.firstName || !passengerData.lastName) {
    throw new Error("First name and last name are required");
  }

  const user = await findUser(userId, email);
  if (!user) throw new Error("User not found");

  const newPassenger = {
    id: "pax_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    firstName: passengerData.firstName.trim(),
    lastName: passengerData.lastName.trim(),
    type: passengerData.type || "adult",
    gender: passengerData.gender || "male",
    dateOfBirth: passengerData.dateOfBirth || "",
    nationality: passengerData.nationality || "Indian",
    passportNumber: passengerData.passportNumber || "",
    passportExpiry: passengerData.passportExpiry || "",
    frequentFlyerNumber: passengerData.frequentFlyerNumber || "",
    preferredSeat: passengerData.preferredSeat || "any",
    preferredMeal: passengerData.preferredMeal || "standard",
  };

  if (isDBConnected()) {
    user.savedPassengers.push(newPassenger);
    await user.save();
    return newPassenger;
  } else {
    if (!user.savedPassengers) user.savedPassengers = [];
    user.savedPassengers.push(newPassenger);
    user.updatedAt = new Date().toISOString();
    return newPassenger;
  }
}

export async function updateSavedPassengerService(userId, email, passengerId, updateData) {
  const user = await findUser(userId, email);
  if (!user) throw new Error("User not found");

  if (isDBConnected()) {
    const pax = user.savedPassengers.find((p) => p.id === passengerId || String(p._id) === passengerId);
    if (!pax) throw new Error("Passenger not found");
    Object.assign(pax, updateData);
    await user.save();
    return pax;
  } else {
    const list = user.savedPassengers || [];
    const pax = list.find((p) => p.id === passengerId);
    if (!pax) throw new Error("Passenger not found");
    Object.assign(pax, updateData);
    user.updatedAt = new Date().toISOString();
    return pax;
  }
}

export async function deleteSavedPassengerService(userId, email, passengerId) {
  const user = await findUser(userId, email);
  if (!user) throw new Error("User not found");

  if (isDBConnected()) {
    user.savedPassengers = user.savedPassengers.filter(
      (p) => p.id !== passengerId && String(p._id) !== passengerId
    );
    await user.save();
    return { success: true, message: "Passenger removed" };
  } else {
    user.savedPassengers = (user.savedPassengers || []).filter((p) => p.id !== passengerId);
    user.updatedAt = new Date().toISOString();
    return { success: true, message: "Passenger removed" };
  }
}

/**
 * 3. Saved Flights & Price Alerts Services
 */
export async function getSavedFlightsService(userId, email) {
  const profile = await getUserProfileService(userId, email);
  return profile.savedFlights || [];
}

export async function saveFlightService(userId, email, flightData) {
  if (!flightData.flightId || !flightData.flightNumber) {
    throw new Error("Valid flight data is required");
  }

  const user = await findUser(userId, email);
  if (!user) throw new Error("User not found");

  const savedItem = {
    flightId: flightData.flightId,
    flightNumber: flightData.flightNumber,
    airline: flightData.airline,
    from: flightData.from,
    to: flightData.to,
    fromCode: flightData.fromCode,
    toCode: flightData.toCode,
    price: Number(flightData.price) || 0,
    targetPrice: Number(flightData.targetPrice) || Number(flightData.price) || 0,
    alertEnabled: flightData.alertEnabled !== false,
    departure: flightData.departure || "",
    arrival: flightData.arrival || "",
    createdAt: new Date(),
  };

  if (isDBConnected()) {
    // Avoid duplicate save
    const exists = user.savedFlights.some((f) => f.flightId === flightData.flightId);
    if (exists) {
      user.savedFlights = user.savedFlights.map((f) =>
        f.flightId === flightData.flightId ? { ...f.toObject(), ...savedItem } : f
      );
    } else {
      user.savedFlights.push(savedItem);
    }
    await user.save();
    return savedItem;
  } else {
    if (!user.savedFlights) user.savedFlights = [];
    const idx = user.savedFlights.findIndex((f) => f.flightId === flightData.flightId);
    if (idx >= 0) {
      user.savedFlights[idx] = { ...user.savedFlights[idx], ...savedItem };
    } else {
      user.savedFlights.push(savedItem);
    }
    user.updatedAt = new Date().toISOString();
    return savedItem;
  }
}

export async function removeSavedFlightService(userId, email, flightId) {
  const user = await findUser(userId, email);
  if (!user) throw new Error("User not found");

  if (isDBConnected()) {
    user.savedFlights = user.savedFlights.filter((f) => f.flightId !== flightId);
    await user.save();
    return { success: true, message: "Flight removed from favourites" };
  } else {
    user.savedFlights = (user.savedFlights || []).filter((f) => f.flightId !== flightId);
    user.updatedAt = new Date().toISOString();
    return { success: true, message: "Flight removed from favourites" };
  }
}

export async function togglePriceAlertService(userId, email, flightId, { alertEnabled, targetPrice }) {
  const user = await findUser(userId, email);
  if (!user) throw new Error("User not found");

  if (isDBConnected()) {
    const flight = user.savedFlights.find((f) => f.flightId === flightId);
    if (!flight) throw new Error("Saved flight not found");
    if (alertEnabled !== undefined) flight.alertEnabled = alertEnabled;
    if (targetPrice !== undefined) flight.targetPrice = Number(targetPrice);
    await user.save();
    return flight;
  } else {
    const list = user.savedFlights || [];
    const flight = list.find((f) => f.flightId === flightId);
    if (!flight) throw new Error("Saved flight not found");
    if (alertEnabled !== undefined) flight.alertEnabled = alertEnabled;
    if (targetPrice !== undefined) flight.targetPrice = Number(targetPrice);
    user.updatedAt = new Date().toISOString();
    return flight;
  }
}

/**
 * 4. Notifications Center Services
 */
export async function getUserNotificationsService(userId, email) {
  if (isDBConnected()) {
    return await Notification.find({
      $or: [{ userId }, { userEmail: email?.toLowerCase() }],
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  // In-memory notifications + seed initial welcome if empty
  let userNotifs = inMemoryNotifications.filter(
    (n) => String(n.userId) === String(userId) || n.userEmail?.toLowerCase() === email?.toLowerCase()
  );

  if (userNotifs.length === 0) {
    const welcomeNotif = {
      id: "notif_welcome_" + Date.now(),
      userId,
      userEmail: email,
      type: "system",
      title: "Welcome to AirMate Travel Portal!",
      message: "Manage your bookings, track live delay predictions, and save passenger details in one place.",
      read: false,
      createdAt: new Date().toISOString(),
    };
    inMemoryNotifications.unshift(welcomeNotif);
    userNotifs = [welcomeNotif];
  }

  return userNotifs;
}

export async function markNotificationAsReadService(userId, email, notificationId) {
  if (isDBConnected()) {
    await Notification.updateOne(
      {
        _id: notificationId,
        $or: [{ userId }, { userEmail: email?.toLowerCase() }],
      },
      { $set: { read: true } }
    );
    return { success: true };
  }

  const notif = inMemoryNotifications.find((n) => n.id === notificationId || String(n._id) === notificationId);
  if (notif) notif.read = true;
  return { success: true };
}

export async function markAllNotificationsAsReadService(userId, email) {
  if (isDBConnected()) {
    await Notification.updateMany(
      { $or: [{ userId }, { userEmail: email?.toLowerCase() }] },
      { $set: { read: true } }
    );
    return { success: true };
  }

  inMemoryNotifications.forEach((n) => {
    if (String(n.userId) === String(userId) || n.userEmail?.toLowerCase() === email?.toLowerCase()) {
      n.read = true;
    }
  });
  return { success: true };
}

/**
 * 5. Support Tickets Services
 */
export async function getUserSupportTicketsService(userId, email) {
  if (isDBConnected()) {
    return await SupportTicket.find({
      $or: [{ userId }, { userEmail: email?.toLowerCase() }],
    })
      .sort({ updatedAt: -1 })
      .lean();
  }

  return inMemorySupportTickets.filter(
    (t) => String(t.userId) === String(userId) || t.userEmail?.toLowerCase() === email?.toLowerCase()
  );
}

export async function createSupportTicketService(userId, email, userName, { subject, category, bookingRef, priority, message }) {
  if (!subject || !message) {
    throw new Error("Subject and message are required");
  }

  const ticketId = "TKT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const initialMessages = [
    {
      sender: "customer",
      senderName: userName || email,
      message,
      timestamp: new Date(),
    },
    {
      sender: "support",
      senderName: "AirMate Automated Assistant",
      message: `Thank you for reaching out! We have assigned ticket #${ticketId} to our flight operations desk. Category: ${category || "General"}. Our support team will review this shortly.`,
      timestamp: new Date(Date.now() + 1000),
    },
  ];

  const doc = {
    ticketId,
    userId,
    userEmail: email,
    userName: userName || email,
    subject: subject.trim(),
    category: category || "general",
    bookingRef: (bookingRef || "").toUpperCase().trim(),
    priority: priority || "medium",
    status: "open",
    messages: initialMessages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isDBConnected()) {
    const created = await SupportTicket.create(doc);
    return created.toObject();
  } else {
    inMemorySupportTickets.unshift(doc);
    return doc;
  }
}

export async function replySupportTicketService(userId, email, userName, ticketId, messageText) {
  if (!messageText || !messageText.trim()) {
    throw new Error("Message cannot be empty");
  }

  const cleanId = (ticketId || "").replace(/^#/, "").trim().toUpperCase();

  const newReply = {
    sender: "customer",
    senderName: userName || email,
    message: messageText.trim(),
    timestamp: new Date(),
  };

  // Automated assistant reply to keep support responsive
  const botReply = {
    sender: "support",
    senderName: "AirMate Care Specialist",
    message: `Received your update on ticket #${cleanId}. Our specialist is reviewing the details and will contact you directly.`,
    timestamp: new Date(Date.now() + 1500),
  };

  if (isDBConnected()) {
    const ticket = await SupportTicket.findOne({
      $or: [{ ticketId: cleanId }, { ticketId }],
    });
    if (!ticket) throw new Error("Ticket not found");
    ticket.messages.push(newReply, botReply);
    ticket.status = "in_progress";
    ticket.updatedAt = new Date();
    await ticket.save();
    return ticket.toObject();
  } else {
    const ticket = inMemorySupportTickets.find(
      (t) => t.ticketId === cleanId || t.ticketId === ticketId
    );
    if (!ticket) throw new Error("Ticket not found");
    ticket.messages.push(newReply, botReply);
    ticket.status = "in_progress";
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }
}
