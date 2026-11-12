import { useState } from "react";
import {
  Gauge,
  Clock,
  Plane,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Activity,
  Calendar,
  Sparkles,
} from "lucide-react";
import FlightStatusPanel from "@/components/FlightStatus.jsx";
import { delayPrediction } from "@/data/flights";

export default function DelayPredictionTab({ bookings = [] }) {
  const activeBookings = bookings.filter((b) => b.bookingStatus !== "cancelled");

  return (
    <div className="space-y-6">
      {/* Hero Feature Banner matching delay prediction card */}
      <div className="soft-card p-6 flex flex-wrap items-center justify-between gap-4 border border-border bg-card/60">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Gauge className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                Delay Prediction & Flight Status
              </h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary uppercase">
                Mock Risk Model
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every trip carries a mock risk score so you can plan buffers before leaving home.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Flight Search & Live Status Panel */}
        <div className="lg:col-span-7 space-y-6">
          <div className="soft-card p-6 space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Search Flight & View Risk
              </h3>
              <p className="text-xs text-muted-foreground">
                Enter any flight number and travel date to fetch real-time status and calculated delay risk.
              </p>
            </div>

            <FlightStatusPanel />
          </div>
        </div>

        {/* Side Panel: User's Bookings Risk & Buffer Guidelines */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Bookings Delay Forecast */}
          {activeBookings.length > 0 ? (
            <div className="soft-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Plane className="size-4 text-primary" />
                <h3 className="font-display text-sm font-bold text-foreground">
                  Your Trips Delay Forecast
                </h3>
              </div>

              <div className="space-y-3">
                {activeBookings.map((b) => {
                  const flight = b.flight || {};
                  const d = delayPrediction(flight);
                  const isHigh = d.level === "High";
                  const isMed = d.level === "Medium";

                  return (
                    <div
                      key={b.bookingRef || b._id}
                      className="rounded-xl border border-border p-3.5 space-y-2 bg-secondary/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-foreground text-xs">
                          {flight.flightNumber || b.bookingRef}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isHigh
                              ? "bg-destructive/15 text-destructive"
                              : isMed
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          <Activity className="size-3" />
                          {d.risk}% {d.level} Risk
                        </span>
                      </div>

                      <div className="text-xs text-foreground font-medium">
                        {flight.fromCode} → {flight.toCode} · {b.travelDate}
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Recommended buffer: <strong>{d.window}</strong> variance window.
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Buffer Planning Guidelines Card */}
          <div className="soft-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground">
                How Delay Prediction Works
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AirMate calculates delay probability based on historical turnaround times, departure slot congestion, and aircraft load factors.
            </p>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex items-start gap-2.5 rounded-xl border border-border p-3 bg-secondary/20">
                <span className="size-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <strong className="text-foreground">Low Risk (&lt; 35%)</strong>
                  <p className="text-[11px] text-muted-foreground">Morning flights & uncrowded routes. Standard 2-hour arrival buffer.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-border p-3 bg-secondary/20">
                <span className="size-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div>
                  <strong className="text-foreground">Medium Risk (35% – 65%)</strong>
                  <p className="text-[11px] text-muted-foreground">Mid-day rotations. Plan a 15–25 minute extra buffer.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-border p-3 bg-secondary/20">
                <span className="size-2 rounded-full bg-destructive mt-1.5 shrink-0" />
                <div>
                  <strong className="text-foreground">High Risk (&gt; 65%)</strong>
                  <p className="text-[11px] text-muted-foreground">Peak evening flights (after 5 PM) at major metro hubs. Plan a 30–45 minute buffer.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

