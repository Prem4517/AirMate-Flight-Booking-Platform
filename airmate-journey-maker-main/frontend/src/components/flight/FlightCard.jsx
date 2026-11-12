import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Luggage,
  Clock,
  PlaneTakeoff,
  Sparkles,
  Info,
  CheckCircle2,
  ChevronRight,
  Armchair,
  Heart,
} from "lucide-react";
import { currency, formatDuration, makeFareBreakdown } from "@/data/flights";
import { saveFlightToFavourites } from "@/services/api";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export default function FlightCard({ flight, onSelect, search = {}, recommended, reasons = [] }) {
  const { user } = useStore();
  const [showFareBreakdown, setShowFareBreakdown] = useState(false);
  const [saved, setSaved] = useState(false);
  const breakdown = flight.fareBreakdown || makeFareBreakdown(flight.price);

  const handleSaveFlight = async (e) => {
    e.stopPropagation();
    if (!user) {
      toast.info("Please log in to save flights and set price alerts");
      return;
    }

    try {
      await saveFlightToFavourites({
        flightId: flight.id || flight._id,
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        from: flight.from,
        to: flight.to,
        fromCode: flight.fromCode,
        toCode: flight.toCode,
        price: flight.price,
        departure: flight.departure,
        arrival: flight.arrival,
        targetPrice: Math.round(flight.price * 0.9),
        alertEnabled: true,
      });
      setSaved(true);
      toast.success(`Flight ${flight.flightNumber} saved! Price alert active.`);
    } catch (err) {
      toast.error(err.message || "Failed to save flight");
    }
  };

  return (
    <article
      className={
        "relative overflow-hidden rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-lg sm:p-5 " +
        (recommended
          ? "border-primary/50 shadow-[var(--card-shadow)] ring-2 ring-primary/20"
          : "border-border/80")
      }
    >
      {/* Best for you badge or Demo notice */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {recommended ? (
            <span className="inline-flex items-center gap-1.5 rounded-full sky-panel px-3 py-1 text-xs font-semibold">
              <Sparkles className="size-3.5" /> Best Match
            </span>
          ) : null}

          {flight.isDemoFlight !== false ? (
            <span className="rounded-full bg-secondary/80 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Demo Schedule
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {flight.seatsAvailable ? (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {flight.seatsAvailable} seats available
            </span>
          ) : null}

          <button
            type="button"
            onClick={handleSaveFlight}
            title={saved ? "Saved in favourites" : "Save flight & track price drops"}
            className={`rounded-lg p-1.5 transition-colors ${
              saved
                ? "bg-rose-500/15 text-rose-500"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Heart className={`size-4 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          {/* Airline & flight number */}
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary">
              <PlaneTakeoff className="size-4" />
            </span>
            <span className="font-bold text-foreground">{flight.airline}</span>
            <span className="font-mono text-xs text-muted-foreground">· {flight.flightNumber}</span>
            <span className="text-xs text-muted-foreground">({flight.aircraft || "A320"})</span>
          </div>

          {/* Schedule timeline */}
          <div className="mt-4 flex items-center gap-4">
            <div>
              <p className="font-display text-2xl font-extrabold text-foreground">{flight.departure}</p>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs font-bold text-primary">[{flight.fromCode}]</span>
                <p className="text-xs font-medium text-muted-foreground">{flight.from}</p>
              </div>
            </div>

            <div className="flex-1 text-center">
              <p className="text-xs font-semibold text-muted-foreground">
                {formatDuration(flight.durationMins)}
              </p>
              <div className="relative my-1.5 h-0.5 w-full bg-border">
                <span className="absolute -top-1 right-0 size-2.5 rounded-full bg-primary" />
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">
                {flight.stops === 0 ? "Non-stop" : `${flight.stops} Stop (${flight.stopDetails?.[0]?.code || "Layover"})`}
              </p>
            </div>

            <div className="text-right">
              <p className="font-display text-2xl font-extrabold text-foreground">{flight.arrival}</p>
              <div className="flex items-center justify-end gap-1">
                <span className="font-mono text-xs font-bold text-primary">[{flight.toCode}]</span>
                <p className="text-xs font-medium text-muted-foreground">{flight.to}</p>
              </div>
            </div>
          </div>

          {/* Badges: Baggage, Status, Terminal, Class */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-medium">
              <Luggage className="size-3.5" /> {flight.checkinKg || 15}kg Check-in
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-medium">
              <Luggage className="size-3.5" /> {flight.cabinKg || 7}kg Cabin
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-medium">
              <Armchair className="size-3.5" /> {flight.cabinClass || "Economy"}
            </span>
            <span
              className={
                "rounded-full px-2.5 py-1 text-xs font-semibold " +
                (flight.status === "On Time"
                  ? "bg-success/15 text-foreground"
                  : flight.status === "Delayed"
                    ? "bg-warning/20 text-foreground"
                    : "bg-destructive/15 text-destructive")
              }
            >
              {flight.status || "On Time"}
            </span>
          </div>

          {/* Recommended perks list */}
          {recommended && reasons.length ? (
            <ul className="mt-3.5 grid gap-1.5 rounded-xl bg-secondary/60 p-2.5 text-xs sm:grid-cols-2">
              {reasons.map((r) => (
                <li key={r} className="flex items-center gap-1.5 text-foreground/90">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {/* Toggleable Fare Breakdown */}
          {showFareBreakdown ? (
            <div className="mt-3 rounded-xl border border-border/80 bg-secondary/40 p-3 text-xs">
              <p className="mb-2 font-semibold text-foreground">Transparent Fare Breakdown:</p>
              <div className="grid grid-cols-2 gap-y-1 text-muted-foreground">
                <span>Base Fare:</span>
                <span className="text-right text-foreground font-medium">{currency(breakdown.baseFare)}</span>
                <span>Fuel Surcharge:</span>
                <span className="text-right text-foreground font-medium">{currency(breakdown.fuelSurcharge)}</span>
                <span>Airport Taxes:</span>
                <span className="text-right text-foreground font-medium">{currency(breakdown.airportTaxes)}</span>
                <span>User Development Fee:</span>
                <span className="text-right text-foreground font-medium">{currency(breakdown.userDevelopmentFee)}</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Action & Pricing Column */}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-4 sm:w-48 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <div className="text-right">
            <p className="font-display text-2xl font-extrabold text-foreground">{currency(flight.price)}</p>
            <button
              type="button"
              onClick={() => setShowFareBreakdown(!showFareBreakdown)}
              className="text-[11px] text-primary hover:underline"
            >
              {showFareBreakdown ? "Hide fare breakdown" : "View fare breakdown"}
            </button>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onSelect(flight)}
              disabled={flight.status === "Cancelled"}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {flight.status === "Cancelled" ? "Cancelled" : "Select Flight"}
            </button>

            <Link
              to="/flight/$id"
              params={{ id: flight.id || flight._id }}
              search={{
                date: search.date,
                passengers: search.passengers,
                cabinClass: search.cabinClass,
              }}
              className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Flight Details <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
