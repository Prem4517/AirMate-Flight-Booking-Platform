import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import SeatMap from "@/components/booking/SeatMap";
import { currency } from "@/data/flights";
import { SEAT_PRICE } from "@/components/booking/BookingSummary";
import { store, useStore } from "@/lib/store";
import { ChevronRight } from "lucide-react";
import useRequireCustomer from "@/lib/useRequireCustomer";

export default function Seats() {
  const { draft } = useStore();
  const navigate = useNavigate();
  const [seat, setSeat] = useState(draft ? draft.seat : null);
  const isCustomer = useRequireCustomer("/seats");

  if (!isCustomer) return null;

  if (!draft) return <EmptyState />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <span>Passengers</span>
        <ChevronRight className="size-3.5" />
        <span className="text-primary">Seats</span>
        <ChevronRight className="size-3.5" />
        <span>Baggage</span>
        <ChevronRight className="size-3.5" />
        <span>Payment</span>
      </div>

      <h1 className="font-display text-2xl font-bold sm:text-3xl">Select your seat</h1>
      <p className="text-sm text-muted-foreground">
        {draft.flight.airline} {draft.flight.flightNumber} · {draft.flight.fromCode} → {draft.flight.toCode} ·{" "}
        {draft.flight.departure} · {draft.passengers} passenger{draft.passengers > 1 ? "s" : ""}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <SeatMap flight={draft.flight} selected={seat} onSelect={setSeat} />

        <aside className="soft-card h-fit space-y-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Selected seat</p>
            <p className="font-display text-3xl font-bold">{seat || "—"}</p>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Seat fee</span>
            <span className="font-medium">{currency(seat ? SEAT_PRICE : 0)}</span>
          </div>
          <button
            disabled={!seat}
            onClick={() => {
              store.setSeat(seat);
              navigate({ to: "/baggage" });
            }}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Continue to baggage
          </button>
        </aside>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">No flight selected</h1>
      <p className="mt-2 text-sm text-muted-foreground">Search for a flight first, then pick your seat.</p>
      <Link to="/search" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        Search flights
      </Link>
    </div>
  );
}
