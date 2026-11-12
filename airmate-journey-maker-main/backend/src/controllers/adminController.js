import {
  getAllFlights,
  getFlightById,
  createFlight,
  updateFlight,
  rescheduleFlight,
  updateFlightStatus,
  cancelFlight,
  safeDeleteFlight,
  adminSearchFlights,
} from "../services/flightService.js";
import {
  getAllUsers,
  adminSearchUsers,
  adminUpdateUserStatus,
  adminUpdateUserRole,
} from "../services/authService.js";
import {
  adminSearchBookingsService,
  adminUpdateBookingStatusService,
  adminRefundBookingService,
  getPreciseAdminMetricsService,
  getAdminAnalyticsService,
  getBookingByRefService,
  getAllBookingsService,
} from "../services/bookingService.js";
import { logAdminAction, getAuditLogs } from "../services/auditService.js";
import { logger } from "../utils/logger.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { inMemorySupportTickets } from "../services/userService.js";

/**
 * 1. Admin Overview & Precisely Defined Statistics
 */
export async function getOverview(req, res, next) {
  try {
    const flightsResult = await getAllFlights({ limit: 100 });
    const flights = flightsResult.flights || [];
    const users = await getAllUsers();

    const metricsData = await getPreciseAdminMetricsService(flights, users);

    // Also fetch recent 6 bookings and 6 audit logs
    const recentBookings = await adminSearchBookingsService({ limit: 6, page: 1 });
    const recentAudit = await getAuditLogs({ limit: 6, page: 1 });

    res.json({
      metrics: metricsData.metrics,
      definitions: metricsData.metricDefinitions,
      databaseStatus: metricsData.databaseStatus,
      recentBookings: recentBookings.bookings,
      recentAuditLogs: recentAudit.logs,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. Analytics & Trends
 */
export async function getAnalytics(req, res, next) {
  try {
    const flightsResult = await getAllFlights({ limit: 100 });
    const flights = flightsResult.flights || [];
    const analytics = await getAdminAnalyticsService(flights);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
}

/**
 * 3. Flight Management Handlers
 */
export async function getAdminFlights(req, res, next) {
  try {
    const { query, status, airline, page, limit } = req.query;
    const result = await adminSearchFlights({ query, status, airline, page, limit });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createAdminFlight(req, res, next) {
  try {
    const flight = await createFlight(req.body);

    await logAdminAction({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminName: req.user?.name,
      action: "FLIGHT_CREATE",
      targetType: "Flight",
      targetId: flight.flightNumber || flight.id,
      details: {
        flightNumber: flight.flightNumber,
        route: `${flight.fromCode} -> ${flight.toCode}`,
        aircraft: flight.aircraft,
        price: flight.price,
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(201).json(flight);
  } catch (error) {
    if (error.message.includes("required")) {
      return res.status(400).json({ error: "ValidationError", message: error.message });
    }
    next(error);
  }
}

export async function updateAdminFlight(req, res, next) {
  try {
    const { id } = req.params;
    const flight = await updateFlight(id, req.body);
    if (!flight) {
      return res.status(404).json({ error: "NotFound", message: "Flight not found" });
    }

    await logAdminAction({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminName: req.user?.name,
      action: "FLIGHT_UPDATE",
      targetType: "Flight",
      targetId: id,
      details: { updatedFields: Object.keys(req.body) },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json(flight);
  } catch (error) {
    if (error.message.includes("Cannot decrease") || error.message.includes("required")) {
      return res.status(400).json({ error: "ValidationError", message: error.message });
    }
    next(error);
  }
}

export async function rescheduleAdminFlight(req, res, next) {
  try {
    const { id } = req.params;
    const { departure, arrival, durationMins, reason } = req.body;
    const flight = await rescheduleFlight(id, { departure, arrival, durationMins, reason });

    await logAdminAction({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminName: req.user?.name,
      action: "FLIGHT_RESCHEDULE",
      targetType: "Flight",
      targetId: id,
      details: { departure, arrival, reason },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json(flight);
  } catch (error) {
    if (error.message.includes("required")) {
      return res.status(400).json({ error: "ValidationError", message: error.message });
    }
    next(error);
  }
}

export async function updateFlightStatusAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { status, delayMins, reason } = req.body;
    const flight = await updateFlightStatus(id, { status, delayMins, reason });

    await logAdminAction({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminName: req.user?.name,
      action: "FLIGHT_STATUS_UPDATE",
      targetType: "Flight",
      targetId: id,
      details: { status, delayMins, reason },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json(flight);
  } catch (error) {
    if (error.message.includes("Invalid status")) {
      return res.status(400).json({ error: "ValidationError", message: error.message });
    }
    next(error);
  }
}

export async function cancelAdminFlight(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const flight = await cancelFlight(id, { reason });

    await logAdminAction({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminName: req.user?.name,
      action: "FLIGHT_CANCEL",
      targetType: "Flight",
      targetId: id,
      details: { reason },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json(flight);
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminFlight(req, res, next) {
  try {
    const { id } = req.params;
    await safeDeleteFlight(id);

    await logAdminAction({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminName: req.user?.name,
      action: "FLIGHT_DELETE",
      targetType: "Flight",
      targetId: id,
      details: {},
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json({ success: true, message: "Flight deleted safely" });
  } catch (error) {
    if (error.message.includes("Cannot delete flight")) {
      return res.status(400).json({ error: "ConflictError", message: error.message });
    }
    next(error);
  }
}

/**
 * 4. Booking Management Handlers
 */
export async function getAdminBookings(req, res, next) {
  try {
    const { query, bookingStatus, paymentStatus, startDate, endDate, page, limit } = req.query;
    const result = await adminSearchBookingsService({
      query,
      bookingStatus,
      paymentStatus,
      startDate,
      endDate,
      page,
      limit,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAdminBookingDetail(req, res, next) {
  try {
    const { bookingRef } = req.params;
    const booking = await getBookingByRefService(bookingRef);
    if (!booking) {
      return res.status(404).json({ error: "NotFound", message: "Booking not found" });
    }
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function updateAdminBookingStatus(req, res, next) {
  try {
    const { bookingRef } = req.params;
    const { bookingStatus, reason } = req.body;
    const updated = await adminUpdateBookingStatusService(bookingRef, { bookingStatus, reason });

    await logAdminAction({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminName: req.user?.name,
      action: "BOOKING_STATUS_UPDATE",
      targetType: "Booking",
      targetId: bookingRef,
      details: { newStatus: bookingStatus, reason },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json(updated);
  } catch (error) {
    if (error.message.includes("Invalid")) {
      return res.status(400).json({ error: "ValidationError", message: error.message });
    }
    next(error);
  }
}

export async function refundAdminBooking(req, res, next) {
  try {
    const { bookingRef } = req.params;
    const { reason, refundAmount } = req.body;
    const refunded = await adminRefundBookingService(bookingRef, { reason, refundAmount });

    await logAdminAction({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminName: req.user?.name,
      action: "BOOKING_REFUND",
      targetType: "Booking",
      targetId: bookingRef,
      details: {
        refundAmount: refundAmount || refunded.fareBreakdown?.total,
        reason: reason || "Manual admin refund issued",
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json({
      success: true,
      message: `Refund of ₹${refunded.fareBreakdown?.total} processed for booking ${bookingRef}`,
      booking: refunded,
    });
  } catch (error) {
    if (error.message.includes("already been refunded")) {
      return res.status(400).json({ error: "ConflictError", message: error.message });
    }
    next(error);
  }
}

/**
 * 5. User Management Handlers
 */
export async function getAdminUsers(req, res, next) {
  try {
    const { query, role, accountStatus, page, limit } = req.query;
    const result = await adminSearchUsers({ query, role, accountStatus, page, limit });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateAdminUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;
    const updated = await adminUpdateUserStatus(id, accountStatus, req.user);

    await logAdminAction({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminName: req.user?.name,
      action: "USER_STATUS_UPDATE",
      targetType: "User",
      targetId: id,
      details: { newStatus: accountStatus, userEmail: updated.email },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json(updated);
  } catch (error) {
    if (error.message.includes("cannot suspend") || error.message.includes("Invalid")) {
      return res.status(400).json({ error: "ValidationError", message: error.message });
    }
    next(error);
  }
}

export async function updateAdminUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const updated = await adminUpdateUserRole(id, role, req.user);

    await logAdminAction({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminName: req.user?.name,
      action: "USER_ROLE_UPDATE",
      targetType: "User",
      targetId: id,
      details: { newRole: role, userEmail: updated.email },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json(updated);
  } catch (error) {
    if (error.message.includes("cannot demote") || error.message.includes("Invalid")) {
      return res.status(400).json({ error: "ValidationError", message: error.message });
    }
    next(error);
  }
}

/**
 * 6. Audit Logs Handler
 */
export async function getAdminAuditLogs(req, res, next) {
  try {
    const { page, limit, action, targetType, query } = req.query;
    const result = await getAuditLogs({ page, limit, action, targetType, query });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * 7. CSV Export Handler
 */
export async function exportCsvHandler(req, res, next) {
  try {
    const { type } = req.params;
    let csvContent = "";
    let filename = `airmate_${type}_${Date.now()}.csv`;

    function escapeCsv(val) {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }

    if (type === "flights") {
      const flightsRes = await getAllFlights({ limit: 500 });
      const flights = flightsRes.flights || [];
      const headers = [
        "Flight Number",
        "Airline",
        "Aircraft",
        "Origin",
        "Origin Code",
        "Destination",
        "Destination Code",
        "Departure",
        "Arrival",
        "Duration",
        "Base Fare (INR)",
        "Total Seats",
        "Booked Seats",
        "Available Seats",
        "Status",
      ];
      const rows = flights.map((f) => [
        escapeCsv(f.flightNumber),
        escapeCsv(f.airline),
        escapeCsv(f.aircraft),
        escapeCsv(f.from),
        escapeCsv(f.fromCode),
        escapeCsv(f.to),
        escapeCsv(f.toCode),
        escapeCsv(f.departure),
        escapeCsv(f.arrival),
        escapeCsv(f.duration),
        escapeCsv(f.price),
        escapeCsv(f.seatsTotal),
        escapeCsv(f.seatsBooked),
        escapeCsv(f.seatsAvailable),
        escapeCsv(f.status),
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    } else if (type === "bookings") {
      const bookings = await getAllBookingsService();
      const headers = [
        "Booking Ref",
        "Customer Email",
        "Customer Name",
        "Flight Number",
        "Route",
        "Travel Date",
        "Cabin Class",
        "Passengers Count",
        "Seats",
        "Total Fare (INR)",
        "Booking Status",
        "Payment Status",
        "Payment Method",
        "Created At",
      ];
      const rows = bookings.map((b) => [
        escapeCsv(b.bookingRef),
        escapeCsv(b.contact?.email),
        escapeCsv(b.contact?.name),
        escapeCsv(b.flight?.flightNumber),
        escapeCsv(`${b.flight?.fromCode || b.flight?.from} -> ${b.flight?.toCode || b.flight?.to}`),
        escapeCsv(b.travelDate),
        escapeCsv(b.cabinClass),
        escapeCsv(b.passengerCount || (b.passengers ? b.passengers.length : 1)),
        escapeCsv((b.seats || [b.seat]).filter(Boolean).join("; ")),
        escapeCsv(b.fareBreakdown?.total || b.totalAmount || 0),
        escapeCsv(b.bookingStatus),
        escapeCsv(b.paymentStatus),
        escapeCsv(b.paymentMethod),
        escapeCsv(b.createdAt),
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    } else if (type === "users") {
      const users = await getAllUsers();
      const headers = ["ID", "Name", "Email", "Role", "Account Status", "Created At"];
      const rows = users.map((u) => [
        escapeCsv(u.id),
        escapeCsv(u.name),
        escapeCsv(u.email),
        escapeCsv(u.role),
        escapeCsv(u.accountStatus),
        escapeCsv(u.createdAt),
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    } else if (type === "audit-logs") {
      const { logs } = await getAuditLogs({ limit: 500 });
      const headers = ["Timestamp", "Admin Email", "Admin Name", "Action", "Target Type", "Target ID", "IP Address", "Details"];
      const rows = logs.map((l) => [
        escapeCsv(l.createdAt),
        escapeCsv(l.adminEmail),
        escapeCsv(l.adminName),
        escapeCsv(l.action),
        escapeCsv(l.targetType),
        escapeCsv(l.targetId),
        escapeCsv(l.ipAddress),
        escapeCsv(JSON.stringify(l.details || {})),
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    } else {
      return res.status(400).json({ error: "BadRequest", message: "Invalid export type" });
    }

    await logAdminAction({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminName: req.user?.name,
      action: "DATA_EXPORT",
      targetType: "Export",
      targetId: type,
      details: { exportType: type },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
}

/**
 * 7. Admin Support Ticket Management
 */
export async function getAdminSupportTickets(req, res, next) {
  try {
    let tickets;
    const { status, search, limit = 50, page = 1 } = req.query;
    const cleanSearch = search ? search.replace(/^#/, "").trim() : "";

    if (SupportTicket.db?.readyState === 1) {
      const filter = {};
      if (status) filter.status = status;
      if (cleanSearch) {
        filter.$or = [
          { ticketId: { $regex: cleanSearch, $options: "i" } },
          { subject: { $regex: cleanSearch, $options: "i" } },
          { userEmail: { $regex: cleanSearch, $options: "i" } },
          { userName: { $regex: cleanSearch, $options: "i" } },
        ];
      }
      const skip = (Number(page) - 1) * Number(limit);
      const [docs, total] = await Promise.all([
        SupportTicket.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
        SupportTicket.countDocuments(filter),
      ]);
      tickets = { tickets: docs, total, page: Number(page), limit: Number(limit) };
    } else {
      let list = [...inMemorySupportTickets];
      if (status) list = list.filter((t) => t.status === status);
      if (cleanSearch) {
        const q = cleanSearch.toLowerCase();
        list = list.filter(
          (t) =>
            t.ticketId?.toLowerCase().includes(q) ||
            t.subject?.toLowerCase().includes(q) ||
            t.userEmail?.toLowerCase().includes(q) ||
            t.userName?.toLowerCase().includes(q)
        );
      }
      const start = (Number(page) - 1) * Number(limit);
      tickets = {
        tickets: list.slice(start, start + Number(limit)),
        total: list.length,
        page: Number(page),
        limit: Number(limit),
      };
    }

    res.json(tickets);
  } catch (error) {
    next(error);
  }
}

export async function getAdminSupportTicketDetail(req, res, next) {
  try {
    const ticketId = (req.params.ticketId || "").replace(/^#/, "").trim().toUpperCase();
    let ticket;

    if (SupportTicket.db?.readyState === 1) {
      ticket = await SupportTicket.findOne({
        $or: [{ ticketId }, { ticketId: req.params.ticketId }],
      }).lean();
    } else {
      ticket = inMemorySupportTickets.find(
        (t) => t.ticketId === ticketId || t.ticketId === req.params.ticketId
      );
    }

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json(ticket);
  } catch (error) {
    next(error);
  }
}

export async function adminReplyToTicket(req, res, next) {
  try {
    const ticketId = (req.params.ticketId || "").replace(/^#/, "").trim().toUpperCase();
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: "Message is required" });

    const adminReply = {
      sender: "support",
      senderName: req.user?.name || "AirMate Support Team",
      message: message.trim(),
      timestamp: new Date(),
    };

    let ticket;
    if (SupportTicket.db?.readyState === 1) {
      ticket = await SupportTicket.findOne({
        $or: [{ ticketId }, { ticketId: req.params.ticketId }],
      });
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      ticket.messages.push(adminReply);
      ticket.status = "in_progress";
      ticket.updatedAt = new Date();
      await ticket.save();
      ticket = ticket.toObject();
    } else {
      ticket = inMemorySupportTickets.find(
        (t) => t.ticketId === ticketId || t.ticketId === req.params.ticketId
      );
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      ticket.messages.push(adminReply);
      ticket.status = "in_progress";
      ticket.updatedAt = new Date().toISOString();
    }

    await logAdminAction({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminName: req.user?.name,
      action: "SUPPORT_REPLY",
      targetType: "SupportTicket",
      targetId: ticketId,
      details: { message: message.trim() },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json(ticket);
  } catch (error) {
    next(error);
  }
}

export async function adminUpdateTicketStatus(req, res, next) {
  try {
    const ticketId = (req.params.ticketId || "").replace(/^#/, "").trim().toUpperCase();
    const { status } = req.body;
    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    let ticket;
    if (SupportTicket.db?.readyState === 1) {
      ticket = await SupportTicket.findOne({
        $or: [{ ticketId }, { ticketId: req.params.ticketId }],
      });
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      ticket.status = status;
      ticket.updatedAt = new Date();
      await ticket.save();
      ticket = ticket.toObject();
    } else {
      ticket = inMemorySupportTickets.find(
        (t) => t.ticketId === ticketId || t.ticketId === req.params.ticketId
      );
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      ticket.status = status;
      ticket.updatedAt = new Date().toISOString();
    }

    await logAdminAction({
      adminId: req.user?.id,
      adminEmail: req.user?.email,
      adminName: req.user?.name,
      action: "SUPPORT_STATUS_UPDATE",
      targetType: "SupportTicket",
      targetId: ticketId,
      details: { newStatus: status },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json(ticket);
  } catch (error) {
    next(error);
  }
}
