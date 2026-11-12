import { useState, useEffect, useCallback, useRef } from "react";
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  ChevronRight,
  Shield,
  Ticket,
} from "lucide-react";
import {
  fetchSupportTickets,
  createSupportTicket,
  replySupportTicket,
} from "@/services/api";
import { subscribeToSupportSync, cleanTicketId } from "@/lib/supportSync";
import { toast } from "sonner";

export default function SupportTab({ userBookings = [] }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef(null);

  // New Ticket Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("booking_cancellation");
  const [bookingRef, setBookingRef] = useState("");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);

  const loadTickets = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const data = await fetchSupportTickets();
        const list = Array.isArray(data) ? data : [];
        setTickets(list);
        if (selectedTicket) {
          const updated = list.find(
            (t) => cleanTicketId(t.ticketId) === cleanTicketId(selectedTicket.ticketId)
          );
          if (updated) setSelectedTicket(updated);
        } else if (list.length > 0) {
          setSelectedTicket(list[0]);
        }
      } catch (err) {
        if (!silent) toast.error(err.message || "Failed to load support tickets");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedTicket?.ticketId]
  );

  useEffect(() => {
    loadTickets();
  }, []);

  // Real-time synchronization: subscribe to localStorage updates and cross-tab storage events
  useEffect(() => {
    const unsubscribe = subscribeToSupportSync((syncedList) => {
      if (Array.isArray(syncedList)) {
        setTickets(syncedList);
        if (selectedTicket) {
          const match = syncedList.find(
            (t) => cleanTicketId(t.ticketId) === cleanTicketId(selectedTicket.ticketId)
          );
          if (match) setSelectedTicket(match);
        }
      }
    });

    const pollTimer = setInterval(() => {
      loadTickets(true);
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, [selectedTicket?.ticketId, loadTickets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicket?.messages?.length]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }

    setCreatingTicket(true);
    try {
      const created = await createSupportTicket({
        subject,
        category,
        bookingRef,
        priority,
        message,
      });
      toast.success(`Support ticket #${created.ticketId} created`);
      setModalOpen(false);
      setSubject("");
      setMessage("");
      setBookingRef("");
      await loadTickets();
      setSelectedTicket(created);
    } catch (err) {
      toast.error(err.message || "Failed to create support ticket");
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      const updated = await replySupportTicket(selectedTicket.ticketId, replyText);
      toast.success("Reply sent");
      setReplyText("");
      setSelectedTicket(updated);
      setTickets((prev) =>
        prev.map((t) => (t.ticketId === updated.ticketId ? updated : t))
      );
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">
            Customer Support & Operations Desk
          </h3>
          <p className="text-xs text-muted-foreground">
            Submit inquiries regarding flight schedule shifts, baggage claims, and instant refund verifications.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-95"
        >
          <Plus className="size-4" /> Open New Ticket
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="soft-card p-12 text-center">
          <LifeBuoy className="mx-auto size-10 text-muted-foreground/40" />
          <h4 className="mt-3 font-display text-base font-bold text-foreground">
            No support requests filed
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Need assistance with a flight or refund? Open a support ticket and our team will assist you.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            <Plus className="size-3.5" /> Submit Support Request
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Ticket List Sidebar */}
          <div className="lg:col-span-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Your Tickets ({tickets.length})
            </span>

            {tickets.map((t) => {
              const isSelected = selectedTicket?.ticketId === t.ticketId;
              const statusColor =
                t.status === "open"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : t.status === "in_progress"
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    : "bg-secondary text-muted-foreground";

              return (
                <div
                  key={t.ticketId}
                  onClick={() => setSelectedTicket(t)}
                  className={`soft-card p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/[0.03] shadow-xs"
                      : "hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-primary">
                      #{t.ticketId}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${statusColor}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>

                  <h5 className="font-bold text-xs text-foreground mt-1 line-clamp-1">{t.subject}</h5>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="capitalize">{t.category.replace("_", " ")}</span>
                    <span>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conversation Thread */}
          {selectedTicket ? (
            <div className="soft-card lg:col-span-7 p-5 flex flex-col h-[520px]">
              {/* Ticket Top bar */}
              <div className="border-b border-border pb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      #{selectedTicket.ticketId}
                    </span>
                    <span className="text-xs font-semibold capitalize text-muted-foreground">
                      · {selectedTicket.category.replace("_", " ")}
                    </span>
                    {selectedTicket.bookingRef && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground">
                        PNR: {selectedTicket.bookingRef}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-foreground mt-1">
                    {selectedTicket.subject}
                  </h4>
                </div>

                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                  Priority: {selectedTicket.priority}
                </span>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3.5 my-3">
                {selectedTicket.messages?.map((msg, i) => {
                  const isUser = msg.sender === "customer";

                  return (
                    <div
                      key={i}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground">
                        <span className="font-bold text-foreground">{msg.senderName}</span>
                        <span>•</span>
                        <span>
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                          isUser
                            ? "bg-primary text-primary-foreground rounded-tr-xs"
                            : "bg-secondary text-secondary-foreground rounded-tl-xs"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="pt-2 border-t border-border flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a message or response..."
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-50 shrink-0"
                >
                  <Send className="size-4" />
                </button>
              </form>
            </div>
          ) : null}
        </div>
      )}

      {/* New Support Ticket Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="soft-card w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="font-display text-base font-bold text-foreground">
                  Open Support Ticket
                </h4>
                <p className="text-xs text-muted-foreground">
                  Reach our 24/7 dedicated flight operations and customer care desk
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Inquire about refund status for PNR AM8X9P2Q"
                  className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
                  >
                    <option value="booking_cancellation">Booking & Cancellation</option>
                    <option value="refund_query">Refund Inquiry</option>
                    <option value="baggage">Baggage & Lost Luggage</option>
                    <option value="flight_delay">Flight Delay / Schedule</option>
                    <option value="web_checkin">Web Check-in & Seats</option>
                    <option value="special_assistance">Special Assistance</option>
                    <option value="general">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Associated Booking (Optional)
                </label>
                <select
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary"
                >
                  <option value="">None / General Inquiry</option>
                  {userBookings.map((b) => (
                    <option key={b.bookingRef} value={b.bookingRef}>
                      PNR: {b.bookingRef} ({b.flight?.fromCode} → {b.flight?.toCode} on {b.travelDate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Message Description *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe your query in detail..."
                  className="w-full rounded-xl border border-input bg-background p-2.5 outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTicket}
                  className="rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground hover:opacity-95 disabled:opacity-50"
                >
                  {creatingTicket ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}