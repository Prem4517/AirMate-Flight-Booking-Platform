import { Luggage, Briefcase, AlertTriangle } from "lucide-react";
import { currency } from "@/data/flights";

export const EXTRA_CHECKIN_RATE = 500; // per kg
export const EXTRA_CABIN_RATE = 750; // per kg

export function baggageCost(flight, checkin, cabin) {
  const overCheckin = Math.max(0, Number(checkin || 0) - flight.checkinKg);
  const overCabin = Math.max(0, Number(cabin || 0) - flight.cabinKg);
  return {
    overCheckin,
    overCabin,
    cost: overCheckin * EXTRA_CHECKIN_RATE + overCabin * EXTRA_CABIN_RATE,
  };
}

export default function BaggageForm({ flight, checkin, cabin, onChange }) {
  const { overCheckin, overCabin, cost } = baggageCost(flight, checkin, cabin);

  return (
    <div className="soft-card space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="font-display text-xl font-bold">Baggage</h2>
        <p className="text-sm text-muted-foreground">
          Included: {flight.checkinKg}kg check-in + {flight.cabinKg}kg cabin. Extra check-in{" "}
          {currency(EXTRA_CHECKIN_RATE)}/kg, extra cabin {currency(EXTRA_CABIN_RATE)}/kg.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          icon={<Luggage className="size-4" />}
          label="Check-in baggage (kg)"
          value={checkin}
          onChange={(v) => onChange({ checkin: v, cabin })}
        />
        <Field
          icon={<Briefcase className="size-4" />}
          label="Cabin baggage (kg)"
          value={cabin}
          onChange={(v) => onChange({ checkin, cabin: v })}
        />
      </div>

      {overCheckin || overCabin ? (
        <div className="flex items-start gap-2 rounded-xl bg-warning/15 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Excess baggage: {overCheckin ? `${overCheckin}kg check-in` : ""}
            {overCheckin && overCabin ? " · " : ""}
            {overCabin ? `${overCabin}kg cabin` : ""} — extra charge {currency(cost)}.
          </p>
        </div>
      ) : (
        <p className="rounded-xl bg-success/15 p-3 text-sm">Within the free allowance. No extra charge.</p>
      )}

      <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
        <span className="text-sm font-medium">Baggage charge</span>
        <span className="font-display text-lg font-bold">{currency(cost)}</span>
      </div>
    </div>
  );
}

function Field({ icon, label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">{icon} {label}</span>
      <input
        type="number"
        min="0"
        max="60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}
