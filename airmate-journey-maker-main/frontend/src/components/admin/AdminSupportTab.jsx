import { useState, useEffect, useCallback, useRef } from "react";
import {
  LifeBuoy,
  MessageSquare,
  Send,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Filter,
} from "lucide-react";
import {
  fetchAdminSupportTickets,
  adminReplyToSupportTicket,
  adminUpdateSupportTicketStatus,
  refundBookingAdmin,
} from "@/services/api";
import { subscribeToSupportSync, cleanTicketId } from "@/lib/supportSync";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "", label: "All Tickets" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const STATUS_COLORS = {
  open: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  in_progress: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  resolved: "bg-secondary text-muted-foreground",
  closed: "bg-secondary text-muted-foreground",
};

const STATUS_ICONS = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle2,
  closed: XCircle,
};

const PRIORITY_COLORS = {
  low: "bg-secondary text-muted-foreground",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  high: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  urgent: "bg-destructive/15 text-destructive",
};

export default function AdminSupportTab() {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const messagesEndRef = useRef(null);

  const loadTickets = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await fetchAdminSupportTickets({
          status: statusFilter || undefined,
          search: searchQuery || undefined,
          limit: 50,
          page: 1,
        });
        const list = Array.isArray(data) ? data : data.tickets || [];
        setTickets(list);
        setTotal(data.total ?? list.length);
        // Keep selectedTicket in sync if it's in the new list
        if (selectedTicket) {
          const updated = list.find((t) => cleanTicketId(t.ticketId) === cleanTicketId(selectedTicket.ticketId));
          if (updated) setSelectedTicket(updated);
        }
      } catch (err) {
        toast.error(err.message || "Failed to load support tickets");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, searchQuery, selectedTicket?.ticketId]
  );

  useEffect(() => {
    loadTickets();
  }, [statusFilter, searchQuery]);

  // Real-time synchronization: subscribe to localStorage updates and cross-tab storage events
  useEffect(() => {
    const unsubscribe = subscribeToSupportSync((syncedList) => {
      let filtered = [...syncedList];
      if (statusFilter) filtered = filtered.filter((t) => t.status === statusFilter);
      if (searchQuery) {
        const q = searchQuery.replace(/^#/, "").toLowerCase().trim();
        filtered = filtered.filter(
          (t) =>
            cleanTicketId(t.ticketId).toLowerCase().includes(q) ||
            t.subject?.toLowerCase().includes(q) ||
            t.bookingRef?.toLowerCase().includes(q) ||
            t.userEmail?.toLowerCase().includes(q) ||
            t.userName?.toLowerCase().includes(q)
        );
      }
      setTickets(filtered);
      setTotal(filtered.length);
      if (selectedTicket) {
        const match = syncedList.find(
          (t) => cleanTicketId(t.ticketId) === cleanTicketId(selectedTicket.ticketId)
        );
        if (match) setSelectedTicket(match);
      }
    });

    // Background interval poll (every 3 seconds) for live server updates without page refresh
    const pollTimer = setInterval(() => {
      loadTickets(true);
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, [statusFilter, searchQuery, selectedTicket?.ticketId, loadTickets]);

  // Auto-scroll messages container when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicket?.messages?.length]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      const updated = await adminReplyToSupportTicket(selectedTicket.ticketId, replyText.trim());
      toast.success("Reply sent to traveler");
      setReplyText("");
      setSelectedTicket(updated);
      setTickets((prev) =>
        prev.map((t) => (t.ticketId === updated.ticketId ? updated : t))
      );
    } catch (err) {
      toast.error(err.message || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const updated = await adminUpdateSupportTicketStatus(selectedTicket.ticketId, newStatus);
      toast.success(`Ticket marked as ${newStatus.replace("_", " ")}`);
      setSelectedTicket(updated);
      setTickets((prev) =>
        prev.map((t) => (t.ticketId === updated.ticketId ? updated : t))
      );
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const [approvingRefund, setApprovingRefund] = useState(false);

  const handleApproveRefund = async () => {
    if (!selectedTicket?.bookingRef) return;
    setApprovingRefund(true);
    try {
      await refundBookingAdmin(selectedTicket.bookingRef, {
        reason: "Admin approved cancellation refund via Support Desk",
      });
      await adminReplyToSupportTicket(
        selectedTicket.ticketId,
        "Your cancellation and refund have been APPROVED by the administrator. Credit has been issued to your original payment mode."
      );
      await adminUpdateSupportTicketStatus(selectedTicket.ticketId, "resolved");
      toast.success(`Cancellation & refund approved for PNR ${selectedTicket.bookingRef}`);
      loadTickets(true);
    } catch (err) {
      toast.error(err.message || "Failed to approve refund");
    } finally {
      setApprovingRefund(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">
            Customer Support Inbox
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} ticket{total !== 1 ? "s" : ""} · Reply and manage traveler support requests
          </p>
        </div>
        <button
          onClick={() => loadTickets(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="flex items-center gap-1.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by ID, email, subject..."
              className="rounded-xl border border-input bg-background pl-8 pr-3 py-2 text-xs outline-none focus:border-primary w-64"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setSearchQuery(""); }}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Clear
            </button>
          )}
        </form>

        <div className="flex items-center gap-1.5 ml-auto">
          <Filter className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Status:</span>
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  statusFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="soft-card p-14 text-center">
          <LifeBuoy className="mx-auto size-10 text-muted-foreground/40" />
          <h4 className="mt-3 font-display text-sm font-bold text-foreground">
            No support tickets found
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {statusFilter || searchQuery
              ? "Try adjusting your filters"
              : "No traveler support requests submitted yet"}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-12 items-start">
          {/* Ticket List */}
          <div className="lg:col-span-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Tickets ({tickets.length})
            </span>

            {tickets.map((t) => {
              const isSelected = selectedTicket?.ticketId === t.ticketId;
              const StatusIcon = STATUS_ICONS[t.status] || AlertCircle;

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
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] font-bold text-primary">
                        #{t.ticketId}
                      </span>
                      <h5 className="font-bold text-xs text-foreground mt-0.5 line-clamp-1">
                        {t.subject}
                      </h5>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {t.userName} · {t.userEmail}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${STATUS_COLORS[t.status] || ""}`}>
                        <StatusIcon className="size-2.5" />
                        {t.status.replace("_", " ")}
                      </span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize ${PRIORITY_COLORS[t.priority] || ""}`}>
                        {t.priority}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="capitalize">{t.category?.replace("_", " ")}</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3" />
                      {t.messages?.length ?? 0}
                      <span className="ml-1">
                        {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : ""}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conversation Thread */}
          {selectedTicket ? (
            <div className="soft-card lg:col-span-7 p-5 flex flex-col h-[560px]">
              {/* Ticket header */}
              <div className="border-b border-border pb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">
                      #{selectedTicket.ticketId}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      · {selectedTicket.category?.replace("_", " ")}
                    </span>
                    {selectedTicket.bookingRef && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground">
                        PNR: {selectedTicket.bookingRef}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-foreground mt-1 truncate">
                    {selectedTicket.subject}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedTicket.userName} · {selectedTicket.userEmail}
                  </p>
                </div>

                {/* Status changer */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-muted-foreground">Status:</span>
                  <select
                    value={selectedTicket.status}
                    disabled={updatingStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="rounded-lg border border-input bg-background px-2 py-1 text-[11px] font-semibold outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  {updatingStatus && <Loader2 className="size-3.5 animate-spin text-primary" />}
                </div>
              </div>

              {/* Cancellation & Refund Approval Action Box */}
              {selectedTicket.category === "booking_cancellation" && selectedTicket.bookingRef && (
                <div className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                      <AlertCircle className="size-4 text-amber-600" />
                      <span>Ticket Cancellation & Refund Request</span>
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                      PNR: <strong>{selectedTicket.bookingRef}</strong> · Refund credit is pending administrator approval.
                    </p>
                  </div>
                  <button
                    onClick={handleApproveRefund}
                    disabled={approvingRefund || selectedTicket.status === "resolved"}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {approvingRefund ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-3.5" />
                    )}
                    {selectedTicket.status === "resolved" ? "Refund Approved" : "Approve & Credit Refund"}
                  </button>
                </div>
              )}

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3.5 my-3">
                {selectedTicket.messages?.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-8">No messages yet</p>
                )}
                {selectedTicket.messages?.map((msg, i) => {
                  const isMe = msg.sender === "support";
                  return (
                    <div
                      key={i}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground">
                        <span className="font-bold text-foreground">{msg.senderName}</span>
                        <span>•</span>
                        <span>
                          {msg.timestamp
                            ? new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                          isMe
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

              {/* Admin Reply Box */}
              <form onSubmit={handleSendReply} className="pt-2 border-t border-border flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a reply to the traveler..."
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-50 shrink-0"
                >
                  {sendingReply ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="soft-card lg:col-span-7 p-10 flex flex-col items-center justify-center text-center">
              <MessageSquare className="size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                Select a ticket to view the conversation
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

