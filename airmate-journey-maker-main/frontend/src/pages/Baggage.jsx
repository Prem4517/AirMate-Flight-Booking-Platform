import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import BaggageForm, { baggageCost } from "@/components/booking/BaggageForm";
import BookingSummary, { computeTotals } from "@/components/booking/BookingSummary";
import { store, useStore } from "@/lib/store";
import { ChevronRight } from "lucide-react";
import useRequireCustomer from "@/lib/useRequireCustomer";

export default function Baggage() {
  const { draft } = useStore();
  const navigate = useNavigate();
  const [bags, setBags] = useState({ checkin: 15, cabin: 7 });
  const isCustomer = useRequireCustomer("/baggage");

  if (!isCustomer) return null;

  if (!draft) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Nothing to check in yet</h1>
        <Link to="/search" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Search flights
        </Link>
      </div>
    );
  }

  const { cost } = baggageCost(draft.flight, bags.checkin, bags.cabin);
  const totals = computeTotals(draft.flight, draft.passengers, draft.seat, cost);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <span>Passengers</span>
        <ChevronRight className="size-3.5" />
        <span>Seats</span>
        <ChevronRight className="size-3.5" />
        <span className="text-primary">Baggage</span>
        <ChevronRight className="size-3.5" />
        <span>Payment</span>
      </div>

      <h1 className="font-display text-2xl font-bold sm:text-3xl">Baggage</h1>
      <p className="text-sm text-muted-foreground">Tell us what you're carrying so there are no surprises at the airport.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <BaggageForm flight={draft.flight} checkin={bags.checkin} cabin={bags.cabin} onChange={setBags} />
        <div className="space-y-4">
          <BookingSummary flight={draft.flight} passengers={draft.passengers} seat={draft.seat} totals={totals} />
          <button
            onClick={() => {
              store.setBaggage({ ...bags, cost });
              navigate({ to: "/checkout" });
            }}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Continue to payment
          </button>
        </div>
      </div>
    </div>
  );
}
