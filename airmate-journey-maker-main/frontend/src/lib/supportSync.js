/**
 * Shared Support Ticket & Chat Synchronization Store
 * Synchronizes ticket threads in real-time between Traveler Support Desk and Admin Support Dashboard
 * using localStorage, window CustomEvents, and cross-tab storage listeners.
 */

const STORAGE_KEY = "airmate_shared_support_tickets_v1";
export const SYNC_EVENT_NAME = "airmate:support-ticket-sync";

export function cleanTicketId(id) {
  if (!id) return "";
  return String(id).replace(/^#/, "").trim().toUpperCase();
}

/**
 * Retrieve shared tickets from persistent local store
 */
export function getSharedTickets() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Failed to read shared support tickets from localStorage:", e);
    return [];
  }
}

/**
 * Persist tickets to shared store and notify all active views (same tab + other tabs)
 */
export function saveSharedTickets(tickets) {
  if (typeof window === "undefined") return;
  try {
    const valid = Array.isArray(tickets) ? tickets : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    // Dispatch in-page event for components in same window
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: { tickets: valid } }));
  } catch (e) {
    console.warn("Failed to save shared support tickets to localStorage:", e);
  }
}

/**
 * Merge two ticket lists deduplicating and combining message threads cleanly
 */
export function mergeTicketLists(primary = [], secondary = []) {
  const map = new Map();

  const addOrMerge = (ticket) => {
    if (!ticket || !ticket.ticketId) return;
    const key = cleanTicketId(ticket.ticketId);
    if (!map.has(key)) {
      map.set(key, { ...ticket, ticketId: key });
    } else {
      const existing = map.get(key);
      // Merge messages by unique timestamp + sender + message
      const seenMsgKeys = new Set();
      const mergedMsgs = [];

      const addMsg = (m) => {
        if (!m) return;
        const msgKey = `${m.sender}-${m.message}-${new Date(m.timestamp || 0).getTime()}`;
        if (!seenMsgKeys.has(msgKey)) {
          seenMsgKeys.add(msgKey);
          mergedMsgs.push(m);
        }
      };

      (existing.messages || []).forEach(addMsg);
      (ticket.messages || []).forEach(addMsg);

      mergedMsgs.sort(
        (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
      );

      const latestUpdated =
        new Date(ticket.updatedAt || 0) > new Date(existing.updatedAt || 0)
          ? ticket.updatedAt
          : existing.updatedAt;

      map.set(key, {
        ...existing,
        ...ticket,
        ticketId: key,
        messages: mergedMsgs,
        updatedAt: latestUpdated || new Date().toISOString(),
      });
    }
  };

  (secondary || []).forEach(addOrMerge);
  (primary || []).forEach(addOrMerge);

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
  );
}

/**
 * Upsert a single ticket into the shared store
 */
export function upsertSharedTicket(ticket) {
  if (!ticket || !ticket.ticketId) return ticket;
  const current = getSharedTickets();
  const merged = mergeTicketLists([ticket], current);
  saveSharedTickets(merged);
  return merged.find((t) => cleanTicketId(t.ticketId) === cleanTicketId(ticket.ticketId)) || ticket;
}

/**
 * Append a new message to a ticket thread in the shared store
 */
export function appendMessageToSharedTicket(ticketId, messageObj) {
  const cleanId = cleanTicketId(ticketId);
  const current = getSharedTickets();
  const index = current.findIndex((t) => cleanTicketId(t.ticketId) === cleanId);

  const formattedMsg = {
    sender: messageObj.sender || "customer",
    senderName: messageObj.senderName || "User",
    message: messageObj.message || "",
    timestamp: messageObj.timestamp || new Date().toISOString(),
  };

  if (index >= 0) {
    const ticket = { ...current[index] };
    const messages = Array.isArray(ticket.messages) ? [...ticket.messages] : [];
    messages.push(formattedMsg);
    ticket.messages = messages;
    ticket.updatedAt = new Date().toISOString();
    if (messageObj.sender === "customer" && ticket.status === "open") {
      ticket.status = "open";
    } else if (messageObj.sender === "support") {
      ticket.status = "in_progress";
    }
    current[index] = ticket;
    saveSharedTickets(current);
    return ticket;
  } else {
    // Create new ticket stub if not found
    const newTicket = {
      ticketId: cleanId,
      subject: `Support Ticket #${cleanId}`,
      category: "general",
      status: "open",
      messages: [formattedMsg],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    current.unshift(newTicket);
    saveSharedTickets(current);
    return newTicket;
  }
}

/**
 * Update a ticket's status in the shared store
 */
export function updateSharedTicketStatus(ticketId, newStatus) {
  const cleanId = cleanTicketId(ticketId);
  const current = getSharedTickets();
  const index = current.findIndex((t) => cleanTicketId(t.ticketId) === cleanId);
  if (index >= 0) {
    current[index] = {
      ...current[index],
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    saveSharedTickets(current);
    return current[index];
  }
  return null;
}

/**
 * Subscribe to real-time ticket synchronization
 * Fires whenever a message or ticket is created/updated (in this window or another tab)
 */
export function subscribeToSupportSync(callback) {
  if (typeof window === "undefined") return () => {};

  const handleInPageSync = (e) => {
    callback(e.detail?.tickets || getSharedTickets());
  };

  const handleStorageChange = (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          callback(parsed);
        }
      } catch (err) {
        console.warn("Error parsing synced storage:", err);
      }
    }
  };

  window.addEventListener(SYNC_EVENT_NAME, handleInPageSync);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(SYNC_EVENT_NAME, handleInPageSync);
    window.removeEventListener("storage", handleStorageChange);
  };
}
