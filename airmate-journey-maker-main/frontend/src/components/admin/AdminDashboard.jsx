import { useMemo, useState, useEffect } from "react";
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
} from "recharts";
import {
  Plane,
  Users,
  Ticket,
  IndianRupee,
  TimerReset,
  Ban,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { flights as seedFlights, revenueSeries, popularRoutes, currency } from "@/data/flights";
import {
  fetchAdminOverview,
  fetchAdminAnalytics,
  fetchFlights,
  createFlightAdmin,
  updateFlightAdmin,
  deleteFlightAdmin,
} from "@/services/api";

const blank = {
  id: "",
  flightNumber: "",
  airline: "",
  from: "",
  to: "",
  fromCode: "",
  toCode: "",
  departure: "",
  arrival: "",
  price: "",
  durationMins: 90,
  checkinKg: 15,
  cabinKg: 7,
  aircraft: "Airbus A320",
  seatsTotal: 180,
  seatsBooked: 0,
  status: "On Time",
  gate: "A1",
  terminal: "T1",
};

export default function AdminDashboard() {
  const [rows, setRows] = useState(seedFlights);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.allSettled([fetchAdminOverview(), fetchAdminAnalytics(), fetchFlights()])
      .then(([overviewRes, analyticsRes, flightsRes]) => {
        if (!active) return;
        if (overviewRes.status === "fulfilled" && overviewRes.value) {
          setOverview(overviewRes.value);
        } else if (overviewRes.status === "rejected") {
          setApiError(overviewRes.reason?.message || "Failed to load live metrics");
        }

        if (analyticsRes.status === "fulfilled" && analyticsRes.value) {
          setAnalytics(analyticsRes.value);
        }

        if (flightsRes.status === "fulfilled" && Array.isArray(flightsRes.value) && flightsRes.value.length > 0) {
          setRows(flightsRes.value);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    if (overview && overview.metrics) {
      return {
        flights: overview.metrics.totalFlights || rows.length,
        passengers: overview.metrics.totalPassengers || rows.reduce((s, f) => s + (f.seatsBooked || 0), 0),
        bookings: overview.metrics.totalBookings || 0,
        revenue: overview.metrics.totalRevenue || rows.reduce((s, f) => s + (f.seatsBooked || 0) * (f.price || 0), 0),
        delayed: overview.metrics.delayedFlights || rows.filter((f) => f.status === "Delayed").length,
        cancelled: overview.metrics.cancelledFlights || rows.filter((f) => f.status === "Cancelled").length,
        registeredUsers: overview.metrics.registeredUsers || 0,
      };
    }

    const passengers = rows.reduce((s, f) => s + (f.seatsBooked || 0), 0);
    const revenue = rows.reduce((s, f) => s + (f.seatsBooked || 0) * (f.price || 0), 0);
    return {
      flights: rows.length,
      passengers,
      bookings: Math.round(passengers * 0.78),
      revenue,
      delayed: rows.filter((f) => f.status === "Delayed").length,
      cancelled: rows.filter((f) => f.status === "Cancelled").length,
      registeredUsers: 0,
    };
  }, [rows, overview]);

  async function submit(e) {
    e.preventDefault();
    if (!form.flightNumber || !form.airline) return;
    setSubmitting(true);
    setApiError("");

    try {
      if (editingId) {
        const payload = { ...form, price: Number(form.price) };
        const updated = await updateFlightAdmin(editingId, payload);
        setRows((r) => r.map((f) => (f.id === editingId ? (updated || { ...f, ...payload }) : f)));
      } else {
        const payload = {
          ...blank,
          ...form,
          price: Number(form.price) || 0,
          id: form.flightNumber.replace(/\s/g, "") + rows.length,
          fromCode: (form.fromCode || form.from).slice(0, 3).toUpperCase(),
          toCode: (form.toCode || form.to).slice(0, 3).toUpperCase(),
        };

        const created = await createFlightAdmin(payload);
        setRows((r) => [created || payload, ...r]);
      }
      setForm(blank);
      setEditingId(null);
    } catch (err) {
      setApiError(err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteFlightAdmin(id);
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (err) {
      setApiError(err.message || "Delete flight failed");
    }
  }

  return (
    <div className="space-y-8">
      {apiError ? (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <ShieldAlert className="size-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      ) : null}

      {/* Operations KPI Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Plane className="size-5" />} label="Total Flights" value={stats.flights} />
        <Stat
          icon={<Users className="size-5" />}
          label="Passengers"
          value={stats.passengers.toLocaleString("en-IN")}
        />
        <Stat
          icon={<Ticket className="size-5" />}
          label="Bookings"
          value={stats.bookings.toLocaleString("en-IN")}
        />
        <Stat icon={<IndianRupee className="size-5" />} label="Revenue" value={currency(stats.revenue)} />
        <Stat icon={<TimerReset className="size-5" />} label="Delayed" value={stats.delayed} tone="warning" />
        <Stat icon={<Ban className="size-5" />} label="Cancelled" value={stats.cancelled} tone="destructive" />
        {stats.registeredUsers > 0 ? (
          <Stat
            icon={<UserCheck className="size-5" />}
            label="Registered Users"
            value={stats.registeredUsers}
          />
        ) : null}
      </section>

      {/* Analytics Charts */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="soft-card p-5">
          <h3 className="mb-4 font-display text-lg font-bold">Revenue over time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.monthlyRevenue || revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => v / 1000 + "k"} />
                <Tooltip formatter={(v) => currency(v)} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="soft-card p-5">
          <h3 className="mb-4 font-display text-lg font-bold">Popular routes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.popularRoutes || popularRoutes}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="route" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip />
                <Bar dataKey="trips" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Flight Management Form */}
      <section className="soft-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Flight Dispatch & Scheduling</h3>
          {submitting ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>

        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["flightNumber", "Flight number (AM 101)"],
            ["airline", "Airline (AirMate Express)"],
            ["from", "Departure City"],
            ["to", "Destination City"],
            ["departure", "Departure Time (09:40)"],
            ["arrival", "Arrival Time (11:05)"],
            ["price", "Price (₹)"],
          ].map(([key, label]) => (
            <input
              key={key}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              placeholder={label}
              required={key === "flightNumber" || key === "airline"}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {editingId ? (
              <>Save Changes</>
            ) : (
              <>
                <Plus className="size-4" /> Add Flight
              </>
            )}
          </button>
        </form>

        {editingId ? (
          <div className="mt-2 text-right">
            <button
              onClick={() => {
                setEditingId(null);
                setForm(blank);
              }}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Cancel editing
            </button>
          </div>
        ) : null}

        {/* Flight Table */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Flight</th>
                <th className="py-2 pr-3">Airline</th>
                <th className="py-2 pr-3">Route</th>
                <th className="py-2 pr-3">Times</th>
                <th className="py-2 pr-3">Price</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id || f._id} className="border-b border-border/70 last:border-0">
                  <td className="py-3 pr-3 font-medium">{f.flightNumber}</td>
                  <td className="py-3 pr-3">{f.airline}</td>
                  <td className="py-3 pr-3">
                    {f.from} → {f.to}
                  </td>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {f.departure} – {f.arrival}
                  </td>
                  <td className="py-3 pr-3">{currency(f.price)}</td>
                  <td className="py-3 pr-3">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{f.status}</span>
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setForm({ ...f, price: String(f.price) });
                          setEditingId(f.id);
                        }}
                        className="rounded-lg border border-border p-1.5 hover:bg-secondary"
                        aria-label={`Edit ${f.flightNumber}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="rounded-lg border border-border p-1.5 text-destructive hover:bg-destructive/10"
                        aria-label={`Delete ${f.flightNumber}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, tone }) {
  return (
    <div className="soft-card flex items-center gap-4 p-5">
      <span
        className={
          "grid size-11 place-items-center rounded-xl " +
          (tone === "warning"
            ? "bg-warning/20 text-foreground"
            : tone === "destructive"
              ? "bg-destructive/15 text-destructive"
              : "sky-panel")
        }
      >
        {icon}
      </span>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
