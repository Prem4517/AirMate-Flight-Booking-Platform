import {
  Plane,
  Ticket,
  Users,
  UserCheck,
  IndianRupee,
  Clock,
  Ban,
  RotateCcw,
  Info,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function AdminOverviewTab({
  overview,
  loading,
  onNavigateTab,
}) {
  const metrics = overview?.metrics || {
    flightCount: 0,
    confirmedBookings: 0,
    registeredUsers: 0,
    totalPassengers: 0,
    collectedRevenue: 0,
    pendingPayments: 0,
    pendingAmount: 0,
    cancellations: 0,
    refunds: 0,
    refundedAmount: 0,
  };

  const definitions = overview?.definitions || {};

  const kpis = [
    {
      id: "flights",
      title: "Scheduled Flights",
      value: metrics.flightCount,
      formatted: metrics.flightCount,
      icon: Plane,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      definition:
        definitions.flightCount ||
        "Total scheduled flights currently in the active flight catalog.",
      tabTarget: "flights",
    },
    {
      id: "confirmed",
      title: "Confirmed Bookings",
      value: metrics.confirmedBookings,
      formatted: metrics.confirmedBookings,
      icon: Ticket,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      definition:
        definitions.confirmedBookings ||
        "Total bookings with confirmed status across all cabin classes.",
      tabTarget: "bookings",
    },
    {
      id: "revenue",
      title: "Collected Revenue",
      value: metrics.collectedRevenue,
      formatted: `₹${(metrics.collectedRevenue || 0).toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      badge: "Gross Settled",
      definition:
        definitions.collectedRevenue ||
        "Gross settled revenue from successfully paid bookings. Excludes pending, failed, and refunded amounts.",
      tabTarget: "analytics",
    },
    {
      id: "passengers",
      title: "Passengers Booked",
      value: metrics.totalPassengers,
      formatted: (metrics.totalPassengers || 0).toLocaleString("en-IN"),
      icon: Users,
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
      definition:
        definitions.totalPassengers ||
        "Total passengers registered on confirmed flight itineraries.",
      tabTarget: "bookings",
    },
    {
      id: "users",
      title: "Registered Users",
      value: metrics.registeredUsers,
      formatted: metrics.registeredUsers,
      icon: UserCheck,
      color: "text-teal-500 bg-teal-500/10 border-teal-500/20",
      definition:
        definitions.registeredUsers ||
        "Total registered passenger and administrator accounts in system.",
      tabTarget: "users",
    },
    {
      id: "pending",
      title: "Pending Payments",
      value: metrics.pendingPayments,
      formatted: `${metrics.pendingPayments} (₹${(metrics.pendingAmount || 0).toLocaleString("en-IN")})`,
      icon: Clock,
      color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
      definition:
        definitions.pendingPayments ||
        "Bookings created but awaiting customer payment confirmation or gateway settlement.",
      tabTarget: "bookings",
    },
    {
      id: "cancellations",
      title: "Cancellations",
      value: metrics.cancellations,
      formatted: metrics.cancellations,
      icon: Ban,
      color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
      definition:
        definitions.cancellations ||
        "Bookings cancelled prior to departure either by customer or flight operation control.",
      tabTarget: "bookings",
    },
    {
      id: "refunds",
      title: "Refunds Processed",
      value: metrics.refunds,
      formatted: `${metrics.refunds} (₹${(metrics.refundedAmount || 0).toLocaleString("en-IN")})`,
      icon: RotateCcw,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      definition:
        definitions.refunds ||
        "Bookings where payments have been reversed or credited back to original payment source.",
      tabTarget: "bookings",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Live System Operational Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex size-3 rounded-full bg-emerald-500"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Flight Operations Engine</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Live & Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              All routes, manifest calculations, and fare validations computed on server.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span className="text-muted-foreground">Admin Session:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Protected</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-border/90 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`grid size-11 place-items-center rounded-xl border ${kpi.color}`}
                  >
                    <Icon className="size-5.5" />
                  </div>
                  {kpi.badge && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {kpi.badge}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
                    {loading ? "..." : kpi.formatted}
                  </p>
                </div>
              </div>

              {/* Metric Definition Card Footer */}
              <div className="mt-4 border-t border-border/50 pt-3">
                <div className="group/tip relative flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="line-clamp-1">{kpi.definition}</span>
                  <button
                    onClick={() => onNavigateTab(kpi.tabTarget)}
                    className="ml-2 inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
                  >
                    View <ArrowRight className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overview Feeds: Recent Bookings & Audit Trail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Bookings Feed */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-bold text-foreground">Recent Passenger Bookings</h3>
              <p className="text-xs text-muted-foreground">Real-time reservation activity</p>
            </div>
            <button
              onClick={() => onNavigateTab("bookings")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              All Bookings <ArrowRight className="size-3" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-border/40">
            {overview?.recentBookings && overview.recentBookings.length > 0 ? (
              overview.recentBookings.map((b) => (
                <div key={b.bookingRef} className="flex items-center justify-between py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {b.bookingRef}
                      </span>
                      <span className="text-xs font-medium text-foreground">
                        {b.flight?.flightNumber || "FLIGHT"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {b.flight?.fromCode} ➔ {b.flight?.toCode}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {b.contact?.name || b.contact?.email} · {b.passengerCount || 1} pax · Travel:{" "}
                      {b.travelDate}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-foreground">
                      ₹{(b.fareBreakdown?.total || 0).toLocaleString("en-IN")}
                    </span>
                    <div>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          b.bookingStatus === "confirmed"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : b.bookingStatus === "cancelled"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {b.bookingStatus}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent bookings logged yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Logs Preview */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-bold text-foreground">Operational Action Audit Trail</h3>
              <p className="text-xs text-muted-foreground">Recent administrator actions</p>
            </div>
            <button
              onClick={() => onNavigateTab("audit")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Full Audit Trail <ArrowRight className="size-3" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-border/40">
            {overview?.recentAuditLogs && overview.recentAuditLogs.length > 0 ? (
              overview.recentAuditLogs.map((log, idx) => (
                <div key={log.id || log._id || idx} className="flex items-start justify-between py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                        {log.action}
                      </span>
                      <span className="text-xs font-medium text-foreground">
                        {log.targetType}: {log.targetId}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      By {log.adminEmail} · IP: {log.ipAddress || "127.0.0.1"}
                    </p>
                  </div>

                  <span className="text-[10px] text-muted-foreground">
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Audit trail active. Recent administrative actions will appear here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
