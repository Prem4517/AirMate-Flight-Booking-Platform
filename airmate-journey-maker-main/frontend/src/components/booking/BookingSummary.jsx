import { currency } from "@/data/flights";

export const SEAT_PRICE = 350;
const EXTRA_CHECKIN_RATE = 500;
const EXTRA_CABIN_RATE = 750;
const TAX_RATE = 0.09;

/**
 * Client-side fare estimate — for display before backend confirmation.
 * The backend always overrides this with server-computed totals.
 */
export function computeTotals(flight, passengers, seat, baggageCost) {
  const paxCount = typeof passengers === "number" ? passengers : 1;
  const base = flight.price * paxCount;
  const seatPrice = seat ? SEAT_PRICE * paxCount : 0;
  const bags = baggageCost || 0;
  const subtotal = base + seatPrice + bags;
  const taxes = Math.round(subtotal * TAX_RATE);
  return { base, seatPrice, baggage: bags, taxes, total: subtotal + taxes };
}

export default function BookingSummary({ flight, passengers, seat, totals }) {
  const rows = [
    [`Flight fare (${passengers} × ${currency(flight.price)})`, totals.base],
    [seat ? `Seat ${seat}` : "Seat (not selected)", totals.seatPrice],
    ["Baggage", totals.baggage],
    ["Taxes & fees (9%)", totals.taxes],
  ];

  return (
    <div className="soft-card overflow-hidden">
      <div className="sky-panel px-5 py-4">
        <p className="text-xs uppercase tracking-widest opacity-80">Booking summary</p>
        <p className="font-display text-lg font-bold">
          {flight.fromCode} → {flight.toCode} · {flight.flightNumber}
        </p>
        <p className="text-sm opacity-90">
          {flight.airline} · {flight.departure} – {flight.arrival}
        </p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-border last:border-0">
              <td className="px-5 py-3 text-muted-foreground">{label}</td>
              <td className="px-5 py-3 text-right font-medium">{currency(value)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-secondary">
            <td className="px-5 py-4 font-display text-base font-bold">Total payable</td>
            <td className="px-5 py-4 text-right font-display text-xl font-bold text-primary">
              {currency(totals.total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
