import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  IndianRupee,
  Calendar,
  Compass,
  Plane,
  BarChart3,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { fetchAdminAnalytics } from "@/services/api";
import { toast } from "sonner";

export default function AdminAnalyticsTab() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAdminAnalytics()
      .then((data) => {
        if (active) setAnalytics(data);
      })
      .catch((err) => {
        if (active) toast.error(err.message || "Failed to load analytics");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="mt-3 text-xs font-semibold text-muted-foreground">
          Aggregating persisted operations analytics...
        </span>
      </div>
    );
  }

  const monthlyRevenue = analytics?.monthlyRevenue || [];
  const bookingTrends = analytics?.bookingTrends || [];
  const popularRoutes = analytics?.popularRoutes || [];
  const flightOccupancy = analytics?.flightOccupancy || [];
  const airlinePerformance = analytics?.airlinePerformance || [];
  const totalBookings = analytics?.totalPersistedBookings || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Operational Intelligence & Revenue Analytics</h2>
        <p className="text-xs text-muted-foreground">
          Real-time metrics calculated from actual persisted MongoDB flight schedules and passenger manifests.
        </p>
      </div>

      {/* Database State Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-xs">
        <div className="flex items-center gap-2.5">
          <CheckCircle className="size-4 text-emerald-500" />
          <span className="font-semibold text-foreground">
            Analysis calculated from {totalBookings} persisted reservations across Indian airspace.
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">Updated in real-time</span>
      </div>

      {/* Top Charts: Monthly Revenue & Booking Trends */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Revenue Chart */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-bold text-foreground">Settled Revenue Trend</h3>
              <p className="text-xs text-muted-foreground">Gross collected fares (excluding refunds)</p>
            </div>
            <IndianRupee className="size-4 text-amber-500" />
          </div>

          <div className="mt-4 h-64">
            {monthlyRevenue.length > 0 && monthlyRevenue.some((m) => m.revenue > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Collected Revenue"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <AlertCircle className="size-6 text-muted-foreground/60" />
                <p className="mt-2 font-medium">No paid bookings logged yet for revenue plotting</p>
                <p className="text-[11px]">Revenue curve will generate automatically as customer bookings are completed.</p>
              </div>
            )}
          </div>
        </div>

        {/* Booking Trends Chart */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-bold text-foreground">Daily Reservation Volume</h3>
              <p className="text-xs text-muted-foreground">Confirmed vs Cancelled reservations (7-day window)</p>
            </div>
            <BarChart3 className="size-4 text-primary" />
          </div>

          <div className="mt-4 h-64">
            {bookingTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="confirmed" name="Confirmed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No recent booking trend data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popular Routes & Flight Occupancy */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Popular Routes */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-bold text-foreground">Top Operational Routes</h3>
              <p className="text-xs text-muted-foreground">Ranked by passenger demand and volume</p>
            </div>
            <Compass className="size-4 text-indigo-500" />
          </div>

          <div className="mt-4 space-y-3">
            {popularRoutes.length > 0 ? (
              popularRoutes.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary/30 p-3">
                  <div>
                    <span className="font-bold text-foreground">{r.route}</span>
                    <p className="text-[11px] text-muted-foreground">
                      {r.from} ➔ {r.to}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-foreground">
                      {r.passengers} passengers
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      ₹{(r.revenue || 0).toLocaleString("en-IN")} collected
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No route trends available.
              </div>
            )}
          </div>
        </div>

        {/* Flight Occupancy */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-bold text-foreground">Aircraft Fleet Seat Occupancy</h3>
              <p className="text-xs text-muted-foreground">Load factors across active flights</p>
            </div>
            <Plane className="size-4 text-blue-500" />
          </div>

          <div className="mt-4 space-y-3">
            {flightOccupancy.length > 0 ? (
              flightOccupancy.map((f) => (
                <div key={f.id} className="rounded-xl border border-border/50 bg-secondary/30 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-foreground">{f.flightNumber}</span>
                      <span className="ml-2 text-muted-foreground">({f.route})</span>
                    </div>
                    <span className="font-extrabold text-foreground">{f.occupancyRate}%</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {f.seatsBooked} / {f.seatsTotal} seats
                    </span>
                    <span className="capitalize">{f.status}</span>
                  </div>

                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full ${
                        f.occupancyRate > 80 ? "bg-rose-500" : f.occupancyRate > 50 ? "bg-amber-500" : "bg-primary"
                      }`}
                      style={{ width: `${f.occupancyRate}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No flights available for occupancy measurement.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Airline Fleet Performance */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="border-b border-border/60 pb-3">
          <h3 className="font-bold text-foreground">Airline Fleet & Carrier Performance</h3>
          <p className="text-xs text-muted-foreground">
            Market share, on-time percentage, and capacity breakdown across registered carriers
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/50 font-bold text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Carrier / Airline</th>
                <th className="px-4 py-2.5">Active Flights</th>
                <th className="px-4 py-2.5">Total Seats Booked</th>
                <th className="px-4 py-2.5">On-Time Performance</th>
                <th className="px-4 py-2.5 text-right">Generated Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {airlinePerformance.map((a, i) => (
                <tr key={i} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-bold text-foreground">{a.airline}</td>
                  <td className="px-4 py-3">{a.flights} flights</td>
                  <td className="px-4 py-3 font-semibold">{a.seatsBooked} seats</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        a.onTimeRate >= 80
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {a.onTimeRate}% on-time
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-foreground">
                    ₹{(a.revenue || 0).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
