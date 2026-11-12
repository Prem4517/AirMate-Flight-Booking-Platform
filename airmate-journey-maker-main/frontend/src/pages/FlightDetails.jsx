import { useEffect, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import {
  Plane,
  ArrowLeft,
  Luggage,
  Clock,
  ShieldCheck,
  Check,
  AlertTriangle,
  Info,
  Calendar,
  MapPin,
  Loader2,
  Armchair,
} from "lucide-react";
import { fetchFlightById } from "@/services/api";
import { currency, formatDuration, defaultCabinClasses, makeFareBreakdown } from "@/data/flights";
import { store } from "@/lib/store";
import { bookingRedirectFromDraft } from "@/lib/authRedirect";

export default function FlightDetails({ flightId }) {
  const [flight, setFlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClass, setSelectedClass] = useState("Economy");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    fetchFlightById(flightId)
      .then((data) => {
        if (!active) return;
        if (data) {
          setFlight(data);
          if (data.cabinClass) setSelectedClass(data.cabinClass);
        } else {
          setError("Flight not found or invalid flight identifier.");
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Failed to load flight details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [flightId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Fetching flight details and live fare breakdown...
        </p>
      </div>
    );
  }

  if (error || !flight) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="grid size-14 mx-auto place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Flight Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error || "Flight details are unavailable."}</p>
        <Link
          to="/search"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <ArrowLeft className="size-4" /> Return to Search
        </Link>
      </div>
    );
  }

  const classes = flight.cabinClasses && flight.cabinClasses.length ? flight.cabinClasses : defaultCabinClasses;
  const currentClassObj = classes.find((c) => c.className === selectedClass) || classes[0];
  const classMultiplier = currentClassObj.priceMultiplier || 1;
  const finalPrice = Math.round(flight.price * classMultiplier);
  const breakdown = makeFareBreakdown(finalPrice);

  function handleSelectFlight() {
    const customizedFlight = {
      ...flight,
      price: finalPrice,
      cabinClass: selectedClass,
      checkinKg: currentClassObj.baggageKg || flight.checkinKg,
      cabinKg: currentClassObj.cabinKg || flight.cabinKg,
      fareBreakdown: breakdown,
    };
    // passengers comes from search params (default 1)
    const params = new URLSearchParams(window.location.search);
    const paxCount = Number(params.get("passengers")) || 1;
    // Preserve the search date through flight details, accepting legacy links too.
    const travelDate = params.get("date") || params.get("departDate") || null;
    store.startBooking(customizedFlight, paxCount, travelDate);
    const user = store.get().user;
    const redirect = bookingRedirectFromDraft(store.get().draft, "/passengers");
    if (!user) {
      navigate({ to: "/auth", search: { redirect } });
      return;
    }
    const query = Object.fromEntries(new URLSearchParams(redirect.split("?")[1] || ""));
    navigate({ to: "/passengers", search: query });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/search"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Search Results
        </Link>
      </div>

      {/* Simulated Schedule Notice */}
      <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3.5 text-xs text-foreground">
        <Info className="size-4 shrink-0 text-sky-500 mt-0.5" />
        <div>
          <span className="font-semibold text-sky-600 dark:text-sky-400">
            {flight.dataSourceLabel || "Demo Flight Schedule (Simulated GDS Data)"}
          </span>
          <p className="mt-0.5 text-muted-foreground">
            Availability, fare classes, and timings shown below are realistic demo schedules generated for this demonstration.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
        {/* Main Flight Info */}
        <div className="space-y-6">
          {/* Header Card */}
          <div className="soft-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                  <Plane className="size-5 -rotate-45" />
                </span>
                <div>
                  <h1 className="font-display text-xl font-bold">
                    {flight.airline} · {flight.flightNumber}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Aircraft: {flight.aircraft || "Airbus A320neo"} · Non-stop Scheduled Flight
                  </p>
                </div>
              </div>

              <span
                className={
                  "rounded-full px-3 py-1 text-xs font-semibold " +
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

            {/* Flight Timeline */}
            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div>
                <span className="font-mono text-xs font-bold text-primary">[{flight.fromCode}]</span>
                <p className="font-display text-3xl font-extrabold">{flight.departure}</p>
                <p className="text-sm font-semibold text-foreground">{flight.from}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {flight.fromAirport || `${flight.from} International Airport`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Terminal {flight.fromTerminal || flight.terminal || "T1"} · Gate {flight.gate || "A1"}
                </p>
              </div>

              <div className="flex flex-col items-center px-2">
                <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <Clock className="size-3.5" /> {formatDuration(flight.durationMins)}
                </span>
                <div className="relative my-2 w-24 border-t-2 border-dashed border-primary">
                  <Plane className="absolute -top-2 left-1/2 -translate-x-1/2 size-4 text-primary" />
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {flight.stops === 0 ? "Non-stop" : `${flight.stops} Stop`}
                </span>
              </div>

              <div className="text-right">
                <span className="font-mono text-xs font-bold text-primary">[{flight.toCode}]</span>
                <p className="font-display text-3xl font-extrabold">{flight.arrival}</p>
                <p className="text-sm font-semibold text-foreground">{flight.to}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {flight.toAirport || `${flight.to} International Airport`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Terminal {flight.toTerminal || "T2"} · Baggage Belt Assigned
                </p>
              </div>
            </div>

            {/* Layover details if stop exists */}
            {flight.stops > 0 && flight.stopDetails && flight.stopDetails.length > 0 ? (
              <div className="mt-5 rounded-xl border border-border/80 bg-secondary/50 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Layover Connection:</p>
                {flight.stopDetails.map((s, idx) => (
                  <p key={idx} className="mt-0.5">
                    {s.airport} ({s.code}) · Layover duration {formatDuration(s.durationMins)}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          {/* Cabin Class Selection */}
          <div className="soft-card p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Armchair className="size-5 text-primary" /> Select Cabin Class
            </h2>
            <p className="text-xs text-muted-foreground">
              Choose your travel tier to customize baggage allowance and in-flight comfort.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {classes.map((c) => {
                const tierPrice = Math.round(flight.price * c.priceMultiplier);
                const isSelected = selectedClass === c.className;

                return (
                  <button
                    key={c.className}
                    type="button"
                    onClick={() => setSelectedClass(c.className)}
                    className={
                      "relative rounded-2xl border p-4 text-left transition-all " +
                      (isSelected
                        ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/30"
                        : "border-border hover:bg-secondary/40")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-foreground">
                        {c.className}
                      </span>
                      <span className="font-display text-base font-extrabold text-foreground">
                        {currency(tierPrice)}
                      </span>
                    </div>

                    <ul className="mt-2.5 space-y-1 text-xs text-muted-foreground">
                      <li className="flex items-center gap-1.5">
                        <Check className="size-3 text-primary" /> {c.baggageKg} kg check-in baggage
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="size-3 text-primary" /> {c.cabinKg} kg cabin baggage
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="size-3 text-primary" /> {c.seatPitch}
                      </li>
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar: Fare Summary & Select Action */}
        <div className="space-y-4">
          <div className="soft-card p-6 shadow-xl sticky top-20">
            <h3 className="font-display text-lg font-bold">Fare Breakdown</h3>
            <p className="text-xs text-muted-foreground">Class: {selectedClass} per passenger</p>

            <div className="mt-4 space-y-2 border-b border-border/80 pb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Airline Fare</span>
                <span className="font-medium">{currency(breakdown.baseFare)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fuel Surcharge (YQ)</span>
                <span className="font-medium">{currency(breakdown.fuelSurcharge)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Airport Taxes (K3)</span>
                <span className="font-medium">{currency(breakdown.airportTaxes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User Development Fee (UDF)</span>
                <span className="font-medium">{currency(breakdown.userDevelopmentFee)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Total Fare</p>
                <p className="font-display text-2xl font-extrabold text-foreground">
                  {currency(breakdown.total)}
                </p>
              </div>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                All taxes included
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Seat Availability:</p>
              <p className="mt-0.5">
                {flight.seatsAvailable || 18} seats remaining at this fare tier (Demo inventory)
              </p>
            </div>

            <button
              type="button"
              onClick={handleSelectFlight}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:opacity-90 active:scale-[0.98]"
            >
              Select Flight & Pick Seat →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
