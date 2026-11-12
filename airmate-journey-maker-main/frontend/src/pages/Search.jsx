import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import {
  SlidersHorizontal,
  PlaneTakeoff,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  FilterX,
} from "lucide-react";
import FlightCard from "@/components/flight/FlightCard";
import SearchForm from "@/components/search/SearchForm";
import { currency, scoreFlight, recommendationReasons } from "@/data/flights";
import { fetchFlights } from "@/services/api";
import { store } from "@/lib/store";
import { bookingRedirectFromDraft } from "@/lib/authRedirect";

const sortOptions = [
  { key: "cheapest", label: "Lowest price" },
  { key: "fastest", label: "Shortest duration" },
  { key: "earliest", label: "Earliest departure" },
  { key: "morning", label: "Morning flights" },
  { key: "value", label: "Best overall value" },
];

const departureWindows = [
  { key: "all", label: "Anytime" },
  { key: "morning", label: "Morning (04:00–12:00)" },
  { key: "afternoon", label: "Afternoon (12:00–18:00)" },
  { key: "evening", label: "Evening (18:00–24:00)" },
];

const stopsOptions = [
  { key: "all", label: "All Flights" },
  { key: "0", label: "Non-stop only" },
  { key: "1", label: "1 Stop" },
];

export default function Search({ search = {} }) {
  const navigate = useNavigate();

  // Filters & Sorting state
  const [maxPrice, setMaxPrice] = useState(Number(search.maxPrice) || 8000);
  const [maxDuration, setMaxDuration] = useState(Number(search.maxDuration) || 240);
  const [selectedAirline, setSelectedAirline] = useState(search.airline || "All");
  const [stops, setStops] = useState(search.stops || "all");
  const [departureWindow, setDepartureWindow] = useState(search.departureWindow || "all");
  const [sortBy, setSortBy] = useState(search.sortBy || "cheapest");
  const [page, setPage] = useState(Number(search.page) || 1);

  // Data fetching state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flightsList, setFlightsList] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 6 });
  const [modifyOpen, setModifyOpen] = useState(false);

  function loadResults() {
    setLoading(true);
    setError("");

    fetchFlights({
      from: search.from || "",
      to: search.to || "",
      date: search.date || "",
      returnDate: search.returnDate || "",
      tripType: search.tripType || "oneway",
      passengers: search.passengers || 1,
      cabinClass: search.cabinClass || "Economy",
      maxPrice,
      maxDuration,
      airline: selectedAirline !== "All" ? selectedAirline : undefined,
      stops: stops !== "all" ? stops : undefined,
      departureWindow: departureWindow !== "all" ? departureWindow : undefined,
      sortBy,
      page,
      limit: 6,
    })
      .then((data) => {
        const flights = Array.isArray(data) ? data : data.flights || [];
        setFlightsList(flights);
        if (data.pagination) {
          setPagination(data.pagination);
        } else {
          setPagination({ total: flights.length, totalPages: 1, limit: 6 });
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load flight results.");
        setFlightsList([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  // Reload when query params or filters change
  useEffect(() => {
    loadResults();
  }, [
    search.from,
    search.to,
    search.date,
    search.returnDate,
    search.passengers,
    search.cabinClass,
    maxPrice,
    maxDuration,
    selectedAirline,
    stops,
    departureWindow,
    sortBy,
    page,
  ]);

  useEffect(() => {
    navigate({
      to: "/search",
      search: {
        from: search.from || "",
        to: search.to || "",
        date: search.date || "",
        returnDate: search.returnDate || "",
        tripType: search.tripType || "oneway",
        passengers: search.passengers || 1,
        cabinClass: search.cabinClass || "Economy",
        maxPrice,
        maxDuration,
        airline: selectedAirline,
        stops,
        departureWindow,
        sortBy,
        page,
      },
      replace: true,
    });
  }, [maxPrice, maxDuration, selectedAirline, stops, departureWindow, sortBy, page]);

  const airlines = useMemo(() => {
    const set = new Set(["AirMate Express", "AirMate Connect", "IndiGo", "Air India", "Vistara", "SpiceJet", "Akasa Air"]);
    flightsList.forEach((f) => {
      if (f.airline) set.add(f.airline);
    });
    return ["All", ...Array.from(set)];
  }, [flightsList]);

  function resetFilters() {
    setMaxPrice(8000);
    setMaxDuration(240);
    setSelectedAirline("All");
    setStops("all");
    setDepartureWindow("all");
    setSortBy("cheapest");
    setPage(1);
  }

  function handleSelectFlight(flight) {
    store.startBooking(flight, search.passengers || 1, search.date || null);
    const user = store.get().user;
    const redirect = bookingRedirectFromDraft(store.get().draft, "/passengers");
    if (!user) {
      navigate({ to: "/auth", search: { redirect } });
      return;
    }
    const query = Object.fromEntries(new URLSearchParams(redirect.split("?")[1] || ""));
    navigate({ to: "/passengers", search: query });
  }

  const bestMatch = flightsList.length > 0 ? flightsList[0] : null;
  const otherFlights = flightsList.length > 1 ? flightsList.slice(1) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Route & Query Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl text-foreground">
            {search.from || "All Indian Hubs"} → {search.to || "All Destinations"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {search.date ? `${search.date} · ` : "Anytime · "}
            {search.passengers || 1} passenger{(search.passengers || 1) > 1 ? "s" : ""} ·{" "}
            {search.cabinClass || "Economy"} ·{" "}
            <span className="font-semibold text-foreground">
              {pagination.total} flight{pagination.total !== 1 ? "s" : ""} found
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModifyOpen(!modifyOpen)}
          className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          {modifyOpen ? "Close Search Box" : "Modify Search"}
        </button>
      </header>

      {/* Collapsible Search Form */}
      {modifyOpen ? (
        <div className="mb-8 rounded-3xl border border-border bg-card p-4 shadow-xl sm:p-6">
          <SearchForm initialValues={search} variant="compact" />
        </div>
      ) : null}

      {/* Simulated Data Disclaimer Notice */}
      <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-foreground">
        <Info className="size-4 shrink-0 text-sky-500 mt-0.5" />
        <div>
          <span className="font-semibold text-sky-600 dark:text-sky-400">
            Demo Flight Discovery Mode
          </span>
          <p className="mt-0.5 text-muted-foreground">
            Displaying realistic simulated schedule and availability data. Live airline GDS feed is currently inactive. Timings, seat availability, and fare classes are for demonstration.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        {/* Filters Sidebar */}
        <aside className="soft-card h-fit space-y-5 p-5">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <SlidersHorizontal className="size-4 text-primary" /> Filter Results
            </h2>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>

          {/* Max Price Filter */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Max Price</span>
              <span className="font-mono text-primary">{currency(maxPrice)}</span>
            </div>
            <input
              type="range"
              min="2000"
              max="10000"
              step="100"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(Number(e.target.value));
                setPage(1);
              }}
              className="mt-2 w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>₹2,000</span>
              <span>₹10,000</span>
            </div>
          </div>

          {/* Stops Filter */}
          <div>
            <label className="mb-2 block text-xs font-semibold">Stops</label>
            <div className="flex flex-col gap-1.5">
              {stopsOptions.map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="stops"
                    value={opt.key}
                    checked={stops === opt.key}
                    onChange={(e) => {
                      setStops(e.target.value);
                      setPage(1);
                    }}
                    className="accent-primary"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Departure Window Filter */}
          <div>
            <label className="mb-2 block text-xs font-semibold">Departure Time</label>
            <div className="flex flex-col gap-1.5">
              {departureWindows.map((win) => (
                <label key={win.key} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="departureWindow"
                    value={win.key}
                    checked={departureWindow === win.key}
                    onChange={(e) => {
                      setDepartureWindow(e.target.value);
                      setPage(1);
                    }}
                    className="accent-primary"
                  />
                  <span>{win.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Airline Filter */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Airline</label>
            <select
              value={selectedAirline}
              onChange={(e) => {
                setSelectedAirline(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            >
              {airlines.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Max Duration Filter */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Max Duration</span>
              <span className="font-mono text-primary">{Math.floor(maxDuration / 60)}h {maxDuration % 60}m</span>
            </div>
            <input
              type="range"
              min="60"
              max="300"
              step="15"
              value={maxDuration}
              onChange={(e) => {
                setMaxDuration(Number(e.target.value));
                setPage(1);
              }}
              className="mt-2 w-full accent-primary"
            />
          </div>
        </aside>

        {/* Results Area */}
        <div className="space-y-4">
          {/* Sorting Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <ArrowUpDown className="size-3.5" /> Sort Flights:
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {sortOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setSortBy(opt.key);
                    setPage(1);
                  }}
                  className={
                    "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors " +
                    (sortBy === opt.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground hover:text-foreground")
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content States */}
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <FlightSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            /* Error State with Retry */
            <div className="soft-card p-10 text-center">
              <div className="grid size-12 mx-auto place-items-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertCircle className="size-6" />
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-foreground">
                Unable to Retrieve Flights
              </h2>
              <p className="mt-1 text-sm text-destructive">{error}</p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={loadResults}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Retry Search
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          ) : flightsList.length === 0 ? (
            /* Empty State */
            <div className="soft-card p-10 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                <FilterX className="size-6" />
              </span>
              <h2 className="mt-4 font-display text-lg font-bold text-foreground">
                No Flights Match Your Criteria
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                No scheduled flights match your current price, duration, or airline filters.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Clear All Filters
                </button>
                <Link
                  to="/"
                  className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
                >
                  Change Origin / Destination
                </Link>
              </div>
            </div>
          ) : (
            /* Flight Cards Listing */
            <>
              {bestMatch ? (
                <FlightCard
                  flight={bestMatch}
                  search={search}
                  recommended={sortBy === "cheapest"}
                  reasons={recommendationReasons(bestMatch, flightsList)}
                  onSelect={handleSelectFlight}
                />
              ) : null}

              {otherFlights.map((f) => (
                <FlightCard key={f.id || f._id} flight={f} search={search} onSelect={handleSelectFlight} />
              ))}

              {/* Pagination Controls */}
              {pagination.totalPages > 1 ? (
                <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total flights)
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 hover:bg-secondary"
                    >
                      <ChevronLeft className="size-3.5" /> Previous
                    </button>

                    <button
                      type="button"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 hover:bg-secondary"
                    >
                      Next <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FlightSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-5">
      <div className="flex justify-between">
        <div className="h-4 w-40 rounded bg-secondary" />
        <div className="h-4 w-24 rounded bg-secondary" />
      </div>
      <div className="mt-5 flex items-center gap-4">
        <div className="h-8 w-20 rounded bg-secondary" />
        <div className="h-0.5 flex-1 bg-border" />
        <div className="h-8 w-20 rounded bg-secondary" />
      </div>
      <div className="mt-5 flex gap-2">
        <div className="h-6 w-24 rounded-full bg-secondary" />
        <div className="h-6 w-24 rounded-full bg-secondary" />
        <div className="h-6 w-20 rounded-full bg-secondary" />
      </div>
    </div>
  );
}
