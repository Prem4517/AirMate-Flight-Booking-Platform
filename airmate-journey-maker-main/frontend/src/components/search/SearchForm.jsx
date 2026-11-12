import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  CalendarDays,
  Search,
  TicketPercent,
  ChevronDown,
  AlertCircle,
  Users,
  Armchair,
} from "lucide-react";
import CityAutocomplete from "@/components/common/CityAutocomplete.jsx";
import PassengerSelector from "@/components/booking/PassengerSelector.jsx";
import { travelClasses, cheapestDayHint, cities, currency } from "@/data/flights";

const today = () => new Date().toISOString().slice(0, 10);
const codeOf = (name) => (cities.find((c) => c.name.toLowerCase() === (name || "").toLowerCase()) || {}).code || name;

export default function SearchForm({
  initialValues = {},
  variant = "hero", // 'hero' on Home page, 'compact' on Search page
}) {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState(initialValues.tripType || "oneway");
  const [from, setFrom] = useState(initialValues.from || "Vijayawada");
  const [to, setTo] = useState(initialValues.to || "Hyderabad");
  const [depart, setDepart] = useState(
    initialValues.date || new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
  );
  const [ret, setRet] = useState(initialValues.returnDate || "");
  const [pax, setPax] = useState({
    adults: Number(initialValues.passengers) || 1,
    children: 0,
    infants: 0,
  });
  const [travelClass, setTravelClass] = useState(initialValues.cabinClass || travelClasses[0]);
  const [recent, setRecent] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const sameCity = Boolean(from && to && from.trim().toLowerCase() === to.trim().toLowerCase());
  const hint = useMemo(() => cheapestDayHint(from, to), [from, to]);
  const totalPassengers = pax.adults + pax.children + pax.infants;

  function swap() {
    setFrom(to);
    setTo(from);
    setErrorMsg("");
  }

  function validate() {
    if (!from || !to) {
      setErrorMsg("Please select both origin and destination cities.");
      return false;
    }
    if (sameCity) {
      setErrorMsg("Origin and destination airports must be different.");
      return false;
    }
    if (!depart) {
      setErrorMsg("Please select a valid departure date.");
      return false;
    }
    if (depart < today()) {
      setErrorMsg("Departure date cannot be in the past.");
      return false;
    }
    if (tripType === "round") {
      if (!ret) {
        setErrorMsg("Please choose a return date for round trip.");
        return false;
      }
      if (ret < depart) {
        setErrorMsg("Return date cannot be earlier than departure date.");
        return false;
      }
    }
    if (totalPassengers < 1 || totalPassengers > 9) {
      setErrorMsg("Total passenger count must be between 1 and 9.");
      return false;
    }
    setErrorMsg("");
    return true;
  }

  function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    setRecent((prev) => {
      const entry = {
        from,
        to,
        date: depart,
        returnDate: tripType === "round" ? ret : "",
        passengers: totalPassengers,
        cabinClass: travelClass,
      };
      const next = [entry, ...prev.filter((r) => !(r.from === from && r.to === to))];
      return next.slice(0, 4);
    });

    navigate({
      to: "/search",
      search: {
        from,
        to,
        date: depart,
        returnDate: tripType === "round" ? ret : "",
        tripType,
        passengers: totalPassengers,
        cabinClass: travelClass,
        page: 1,
      },
    });
  }

  function applyRecent(r) {
    setFrom(r.from);
    setTo(r.to);
    setDepart(r.date || today());
    if (r.returnDate) {
      setTripType("round");
      setRet(r.returnDate);
    } else {
      setTripType("oneway");
      setRet("");
    }
    navigate({
      to: "/search",
      search: {
        from: r.from,
        to: r.to,
        date: r.date,
        returnDate: r.returnDate || "",
        passengers: r.passengers || 1,
        cabinClass: r.cabinClass || "Economy",
        page: 1,
      },
    });
  }

  return (
    <div className={variant === "hero" ? "mt-8" : "w-full"}>
      {/* Mobile Bar Collapsible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-left text-foreground shadow-2xl sm:hidden"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold">
            {codeOf(from)} → {codeOf(to)}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {depart || "Pick date"} · {totalPassengers} pax · {travelClass}
          </span>
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          {expanded ? <ChevronDown className="size-4 rotate-180" /> : <Search className="size-4" />}
        </span>
      </button>

      <div className={(expanded ? "block" : "hidden") + " sm:block"}>
        {/* Trip type selector */}
        <div className="mt-3 inline-flex rounded-full bg-white/15 p-1 text-sm font-semibold sm:mt-0">
          {[
            { key: "oneway", label: "One way" },
            { key: "round", label: "Round trip" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTripType(t.key);
                if (t.key === "oneway") setRet("");
                setErrorMsg("");
              }}
              className={
                "rounded-full px-4 py-1.5 transition-colors " +
                (tripType === t.key ? "bg-card text-foreground shadow-sm" : "text-white/90 hover:text-white")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {errorMsg ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        <form
          onSubmit={submit}
          className="mt-3 grid gap-3 rounded-3xl bg-card p-4 text-foreground shadow-2xl sm:p-5 lg:grid-cols-[1fr_auto_1fr_1fr_1fr]"
        >
          {/* Origin */}
          <CityAutocomplete
            label="Origin"
            placeholder="From where?"
            value={from}
            onChange={(val) => {
              setFrom(val);
              setErrorMsg("");
            }}
            exclude={to}
            warning={sameCity ? "Origin and destination cannot be identical" : ""}
          />

          {/* Swap Button */}
          <button
            type="button"
            onClick={swap}
            title="Swap origin and destination"
            className="mt-6 hidden size-10 place-items-center self-start rounded-xl border border-border bg-background transition-colors hover:bg-secondary lg:grid"
            aria-label="Swap origin and destination"
          >
            <ArrowLeftRight className="size-4 text-primary" />
          </button>

          {/* Destination */}
          <CityAutocomplete
            label="Destination"
            placeholder="To where?"
            value={to}
            onChange={(val) => {
              setTo(val);
              setErrorMsg("");
            }}
            exclude={from}
          />

          {/* Departure Date */}
          <div>
            <Field label="Departure" icon={<CalendarDays className="size-4" />}>
              <input
                type="date"
                min={today()}
                value={depart}
                required
                onChange={(e) => {
                  setDepart(e.target.value);
                  setErrorMsg("");
                  if (ret && e.target.value && ret < e.target.value) {
                    setRet(e.target.value);
                  }
                }}
                className="w-full bg-transparent text-sm font-medium outline-none"
              />
            </Field>
            {from && to ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Cheapest day:{" "}
                <span className="font-semibold text-primary">
                  {hint.day}, {currency(hint.price)}
                </span>
              </p>
            ) : null}
          </div>

          {/* Return Date */}
          <Field
            label={tripType === "round" ? "Return Date" : "Return (One Way)"}
            icon={<CalendarDays className="size-4" />}
          >
            <input
              type="date"
              value={tripType === "round" ? ret : ""}
              min={depart || today()}
              disabled={tripType !== "round" || !depart}
              onChange={(e) => {
                setRet(e.target.value);
                setErrorMsg("");
              }}
              className="w-full bg-transparent text-sm font-medium outline-none disabled:cursor-not-allowed disabled:opacity-40"
            />
          </Field>

          {/* Bottom Bar: Passengers, Cabin Class, Submit Button */}
          <div className="grid gap-3 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-[14rem_14rem_1fr]">
            <PassengerSelector value={pax} onChange={setPax} />

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Armchair className="size-3.5 text-muted-foreground" /> Cabin Class
              </span>
              <select
                value={travelClass}
                onChange={(e) => setTravelClass(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium outline-none focus:border-primary"
              >
                {travelClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={sameCity}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 lg:mt-6 lg:self-start"
            >
              <Search className="size-4" /> Find Flights
            </button>
          </div>
        </form>

        {/* Recent Search Chips */}
        {recent.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-white/90">
              <TicketPercent className="size-3.5" /> Recent searches:
            </span>
            {recent.map((r) => (
              <button
                key={r.from + r.to + r.date}
                type="button"
                onClick={() => applyRecent(r)}
                className="rounded-full bg-white/15 px-3 py-1 font-medium text-white transition-colors hover:bg-white/25"
              >
                {codeOf(r.from)} → {codeOf(r.to)} ({r.date})
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </span>
    </label>
  );
}
