import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock, DollarSign, Sparkles, Sun, TrendingUp, AlertCircle } from "lucide-react";
import { fetchFlightRecommendations } from "@/services/api";
import { currency } from "@/data/flights";
import { store } from "@/lib/store";
import { bookingRedirectFromDraft } from "@/lib/authRedirect";

const sortOptions = [
  { value: "price", label: "Lowest price", icon: DollarSign },
  { value: "duration", label: "Shortest duration", icon: Clock },
  { value: "earliest", label: "Earliest departure", icon: Clock },
  { value: "morning", label: "Morning flights", icon: Sun },
  { value: "value", label: "Best overall value", icon: TrendingUp },
];

export default function RecommendedFlights({ search = {} }) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState(search.sortBy || "value");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recommendations, setRecommendations] = useState(null);

  const travelDate =
    search.date || new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    fetchFlightRecommendations({
      sortBy,
      from: search.from || undefined,
      to: search.to || undefined,
      date: travelDate,
      limit: 12,
    })
      .then((data) => {
        if (!active) return;
        setRecommendations(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Failed to load recommendations");
        setRecommendations(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sortBy, search.from, search.to, travelDate]);

  useEffect(() => {
    navigate({
      to: "/recommendations",
      search: {
        from: search.from || "",
        to: search.to || "",
        date: travelDate,
        returnDate: search.returnDate || "",
        tripType: search.tripType || "oneway",
        passengers: search.passengers || 1,
        cabinClass: search.cabinClass || "Economy",
        sortBy,
      },
      replace: true,
    });
  }, [sortBy]);

  function searchParamsForFlight(flight) {
    return {
      from: flight.from || search.from || "",
      to: flight.to || search.to || "",
      date: travelDate,
      returnDate: search.returnDate || "",
      tripType: search.tripType || "oneway",
      passengers: search.passengers || 1,
      cabinClass: search.cabinClass || "Economy",
      sortBy: sortBy === "value" ? "cheapest" : sortBy,
    };
  }

  function handleSelectFlight(flight) {
    store.startBooking(flight, search.passengers || 1, travelDate);
    const user = store.get().user;
    const redirect = bookingRedirectFromDraft(store.get().draft, "/passengers");
    if (!user) {
      navigate({ to: "/auth", search: { redirect } });
      return;
    }
    navigate({ to: "/passengers", search: Object.fromEntries(new URLSearchParams(redirect.split("?")[1] || "")) });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to Home
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">Recommended flights</h1>
          <p className="text-sm text-muted-foreground">
            Browse MongoDB inventory without signing in. Login is only required to start a booking.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {sortOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSortBy(option.value)}
              className={
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors " +
                (sortBy === option.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground")
              }
            >
              <Icon className="size-4" />
              {option.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-8 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-5">
              <div className="h-4 w-40 rounded bg-secondary" />
              <div className="mt-4 h-8 w-full rounded bg-secondary" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-8 soft-card p-10 text-center">
          <AlertCircle className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Unable to load recommendations</h2>
          <p className="mt-1 text-sm text-destructive">{error}</p>
        </div>
      ) : !recommendations?.flights?.length ? (
        <div className="mt-8 soft-card p-10 text-center">
          <h2 className="font-display text-lg font-bold">No recommended flights right now</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try a different route from Search Flights.</p>
          <Link
            to="/search"
            search={{
              from: search.from || "Vijayawada",
              to: search.to || "Hyderabad",
              date: travelDate,
              passengers: search.passengers || 1,
              cabinClass: search.cabinClass || "Economy",
            }}
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Search flights
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Showing {recommendations.flights.length} flights sorted by {sortBy}
            {search.from && search.to ? ` · ${search.from} → ${search.to}` : ""}
          </p>
          {recommendations.flights.map((flight) => (
            <article key={flight.id || flight._id} className="soft-card p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{flight.flightNumber}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">
                      {flight.airline}
                    </span>
                    {flight.isDemoFlight !== false ? (
                      <span className="text-[11px] text-muted-foreground">Demo schedule</span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div>
                      <p className="font-semibold">{flight.fromCode}</p>
                      <p className="text-xs text-muted-foreground">{flight.departure}</p>
                    </div>
                    <div className="flex-1 border-t border-dashed border-border text-center text-xs text-muted-foreground">
                      {flight.duration}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{flight.toCode}</p>
                      <p className="text-xs text-muted-foreground">{flight.arrival}</p>
                    </div>
                  </div>
                  {flight.recommendationReason ? (
                    <p className="mt-2 text-xs text-primary">{flight.recommendationReason}</p>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-4 sm:w-44 sm:flex-col sm:items-end">
                  <p className="font-display text-xl font-bold">{currency(flight.price)}</p>
                  <div className="flex w-full flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectFlight(flight)}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      Select Flight
                    </button>
                    <Link
                      to="/flight/$id"
                      params={{ id: flight.id || flight._id }}
                      search={searchParamsForFlight(flight)}
                      className="text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {recommendations.meta?.notice ? (
            <p className="pt-2 text-center text-xs text-muted-foreground">{recommendations.meta.notice}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
