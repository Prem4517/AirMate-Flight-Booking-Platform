import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Heart,
  Bell,
  BellOff,
  Plane,
  Trash2,
  TrendingDown,
  ArrowRight,
  Loader2,
  IndianRupee,
} from "lucide-react";
import {
  fetchSavedFlights,
  removeSavedFlight,
  togglePriceAlert,
  fetchFlights,
} from "@/services/api";
import { currency } from "@/data/flights";
import { toast } from "sonner";

export default function SavedFlightsTab() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSaved = async () => {
    try {
      setLoading(true);
      const data = await fetchSavedFlights();
      setFlights(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Failed to load saved flights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const handleRemove = async (flightId) => {
    try {
      await removeSavedFlight(flightId);
      toast.success("Flight removed from favourites");
      setFlights((prev) => prev.filter((f) => f.flightId !== flightId));
    } catch (err) {
      toast.error(err.message || "Failed to remove flight");
    }
  };

  const handleToggleAlert = async (f) => {
    const nextAlert = !f.alertEnabled;
    try {
      await togglePriceAlert(f.flightId, { alertEnabled: nextAlert });
      setFlights((prev) =>
        prev.map((item) =>
          item.flightId === f.flightId ? { ...item, alertEnabled: nextAlert } : item
        )
      );
      toast.success(nextAlert ? "Price alert enabled" : "Price alert disabled");
    } catch (err) {
      toast.error("Failed to update alert settings");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h3 className="font-display text-base font-bold text-foreground">
          Saved Flights & Price Drop Alerts
        </h3>
        <p className="text-xs text-muted-foreground">
          Track routes you're watching. We monitor live fares and notify you when prices dip below your target.
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : flights.length === 0 ? (
        <div className="soft-card p-12 text-center">
          <Heart className="mx-auto size-10 text-muted-foreground/40" />
          <h4 className="mt-3 font-display text-base font-bold text-foreground">
            No saved flights yet
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Search for flights and click the bookmark icon to monitor prices and receive notifications.
          </p>
          <div className="mt-5">
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              Search Flight Routes <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flights.map((f) => {
            const hasDropped = f.targetPrice && f.price <= f.targetPrice;

            return (
              <div
                key={f.flightId}
                className="soft-card p-5 transition-all hover:border-primary/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                        {f.airline} · {f.flightNumber}
                      </span>
                      <h4 className="font-display text-xl font-black text-foreground mt-1">
                        {f.fromCode} → {f.toCode}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {f.from} to {f.to}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemove(f.flightId)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Remove from saved"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl bg-secondary/50 p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Current Fare:</span>
                      <strong className="text-sm font-black text-foreground">
                        {currency(f.price)}
                      </strong>
                    </div>

                    {f.targetPrice > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Target Alert Price:</span>
                        <span>{currency(f.targetPrice)}</span>
                      </div>
                    )}

                    {hasDropped && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <TrendingDown className="size-3.5" /> Price target met! Great time to book.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleAlert(f)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                      f.alertEnabled
                        ? "bg-primary/10 text-primary"
                        : "border border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {f.alertEnabled ? (
                      <>
                        <Bell className="size-3.5" /> Alert Active
                      </>
                    ) : (
                      <>
                        <BellOff className="size-3.5" /> Alerts Off
                      </>
                    )}
                  </button>

                  <Link
                    to="/search"
                    search={{ from: f.fromCode, to: f.toCode }}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-95"
                  >
                    Book Now <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
