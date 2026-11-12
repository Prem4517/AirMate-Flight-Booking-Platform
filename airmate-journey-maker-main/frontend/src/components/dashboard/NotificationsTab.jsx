import { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Plane,
  Ticket,
  Tag,
  Clock,
  Check,
  Loader2,
  Info,
} from "lucide-react";
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/services/api";
import { toast } from "sonner";

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unread, flight, bookings

  const loadNotifs = async () => {
    try {
      setLoading(true);
      const data = await fetchUserNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id || n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to update notifications");
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "flight") return n.type === "flight_status";
    if (filter === "bookings") return n.type === "booking_confirmed" || n.type === "booking_cancelled";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold text-foreground">
              Notifications & Operational Alerts
            </h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Live gate assignments, flight schedule modifications, booking tickets, and refund receipts.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
          >
            <Check className="size-3.5" /> Mark All as Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { id: "all", label: "All Alerts" },
          { id: "unread", label: `Unread (${unreadCount})` },
          { id: "flight", label: "Flight Updates" },
          { id: "bookings", label: "Bookings & Refunds" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              filter === tab.id
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="soft-card p-12 text-center">
          <Bell className="mx-auto size-10 text-muted-foreground/40" />
          <h4 className="mt-3 font-display text-base font-bold text-foreground">
            No notifications in this category
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            You're all caught up with your travel alerts and flight schedules.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notif) => {
            const id = notif.id || notif._id;
            const isBooking = notif.type === "booking_confirmed";
            const isCancelled = notif.type === "booking_cancelled";
            const isFlight = notif.type === "flight_status";
            const isPromo = notif.type === "promo";

            const icon = isBooking ? (
              <Ticket className="size-4 text-emerald-500" />
            ) : isCancelled ? (
              <AlertTriangle className="size-4 text-destructive" />
            ) : isFlight ? (
              <Plane className="size-4 text-amber-500" />
            ) : (
              <Info className="size-4 text-primary" />
            );

            return (
              <div
                key={id}
                className={`soft-card p-4 transition-all flex items-start justify-between gap-4 ${
                  !notif.read ? "border-primary/40 bg-primary/[0.02]" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid size-8 place-items-center rounded-xl bg-secondary shrink-0">
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-foreground">{notif.title}</h4>
                      {!notif.read && (
                        <span className="size-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground/80">
                      <Clock className="size-3" />
                      <span>
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : "Just now"}
                      </span>
                      {notif.bookingRef && (
                        <>
                          <span>•</span>
                          <span className="font-mono font-bold text-foreground">
                            PNR: {notif.bookingRef}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {!notif.read && (
                  <button
                    onClick={() => handleMarkRead(id)}
                    className="rounded-lg p-1 text-xs text-primary hover:bg-primary/10 font-semibold shrink-0"
                    title="Mark as read"
                  >
                    Mark read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
