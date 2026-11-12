import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Gauge, Sparkles, X, BadgePercent } from "lucide-react";
import { popularDestinations, currency } from "@/data/flights";
import SearchForm from "@/components/search/SearchForm.jsx";

const defaultTravelDate = () => new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

export default function Home() {
  const navigate = useNavigate();
  const [promo, setPromo] = useState(true);

  return (
    <div>
      {promo ? (
        <div className="flex items-center justify-center gap-3 bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">
          <BadgePercent className="size-4 shrink-0 text-primary" />
          <p className="min-w-0">
            Use code <span className="font-bold text-primary">AIRMATE10</span> for 10% off your first booking
          </p>
          <button
            onClick={() => setPromo(false)}
            aria-label="Dismiss offer"
            className="shrink-0 rounded-lg p-1 hover:bg-background"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <section className="relative sky-panel">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_45%),radial-gradient(circle_at_80%_0%,white,transparent_35%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24 pb-24 sm:pb-32">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Sparkles className="size-3.5" /> Smart fares · Live delay insights
          </span>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight sm:text-6xl">
            Fly smarter across India with AirMate
          </h1>
          <p className="mt-4 max-w-xl text-base opacity-90 sm:text-lg">
            Compare fares in seconds, choose the right seat, sort baggage upfront and know your delay risk before you leave home.
          </p>

          <SearchForm />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          <Perk 
            icon={<Gauge className="size-5" />} 
            title="Delay prediction" 
            text="Every trip carries a mock risk score so you can plan buffers."
            action="Check flight status"
            onClick={() => navigate({ to: "/flight-status" })}
          />
          <Perk 
            icon={<Sparkles className="size-5" />} 
            title="Best-for-you picks" 
            text="Re-rank results by price, duration or morning departures."
            action="Explore recommended flights"
            onClick={() =>
              navigate({
                to: "/recommendations",
                search: {
                  from: "Vijayawada",
                  to: "Hyderabad",
                  date: defaultTravelDate(),
                  passengers: 1,
                  cabinClass: "Economy",
                  sortBy: "value",
                  tripType: "oneway",
                  returnDate: "",
                },
              })
            }
          />
          <Perk 
            icon={<ShieldCheck className="size-5" />} 
            title="Transparent baggage" 
            text="Extra-kg charges calculated before you pay, never at the counter."
            action="Calculate baggage fees"
            onClick={() => navigate({ to: "/baggage-calculator" })}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Popular destinations</h2>
            <p className="text-sm text-muted-foreground">Trending routes from AirMate travellers this month.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popularDestinations.map((d) => (
            <button
              key={d.code}
              onClick={() =>
                navigate({
                  to: "/search",
                  search: {
                    from: d.city.toLowerCase() === "delhi" ? "Mumbai" : "Delhi",
                    to: d.city,
                    date: defaultTravelDate(),
                    passengers: 1,
                    cabinClass: "Economy",
                    tripType: "oneway",
                    returnDate: "",
                    page: 1,
                  },
                })
              }
              className={
                "group relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-left text-white shadow-[var(--card-shadow)] transition-transform hover:-translate-y-1 " +
                d.hue
              }
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(255,255,255,.35),transparent_55%)]" />
              <div className="relative">
                <p className="text-xs uppercase tracking-widest opacity-80">{d.code}</p>
                <p className="font-display text-2xl font-bold">{d.city}</p>
                <p className="mt-1 text-sm opacity-90">{d.tag}</p>
                <p className="mt-6 text-sm font-semibold">from {currency(d.price)}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}

function Perk({ icon, title, text, action, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="soft-card p-5 text-left cursor-pointer hover:border-primary transition-colors group"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary group-hover:bg-primary group-hover:text-background transition-colors">{icon}</span>
      <h3 className="mt-3 font-display text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground">{text}</p>
      {action && (
        <span className="mt-3 inline-flex items-center text-xs font-semibold text-primary group-hover:underline">
          {action} →
        </span>
      )}
    </button>
  );
}
