import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, CheckCircle2, CreditCard, Lock, AlertCircle, ChevronRight } from "lucide-react";
import BookingSummary from "@/components/booking/BookingSummary";
import { currency } from "@/data/flights";
import { store, useStore } from "@/lib/store";
import useRequireCustomer from "@/lib/useRequireCustomer";

const SEAT_FEE = 350;
const TAX_RATE = 0.09;

/** Client-side fare estimate to show while backend calculates */
function estimateTotals(draft) {
  if (!draft || !draft.flight) return null;
  const { flight, passengers = 1, seat, baggage } = draft;
  const base = flight.price * passengers;
  const seatFee = seat ? SEAT_FEE * passengers : 0;
  const bags = baggage ? (baggage.cost || baggage.extraCost || 0) : 0;
  const fuelSurcharge = Math.round(base * 0.16);
  const airportTaxes = Math.round(base * 0.08);
  const udf = Math.round(base * 0.04);
  const subtotal = base + fuelSurcharge + airportTaxes + udf + seatFee + bags;
  const tax = Math.round(subtotal * TAX_RATE);
  return {
    base,
    seatPrice: seatFee,
    baggage: bags,
    taxes: Math.round(base * 0.09),
    total: base + seatFee + bags + Math.round((base + seatFee + bags) * TAX_RATE),
  };
}

const CARD_PATTERNS = {
  visa: /^4/,
  mastercard: /^5[1-5]/,
  amex: /^3[47]/,
  rupay: /^6/,
};

function detectCardType(number) {
  const clean = number.replace(/\s/g, "");
  for (const [type, pattern] of Object.entries(CARD_PATTERNS)) {
    if (pattern.test(clean)) return type;
  }
  return "card";
}

function formatCardNumber(val) {
  return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(val) {
  const clean = val.replace(/\D/g, "").slice(0, 4);
  if (clean.length >= 3) return clean.slice(0, 2) + " / " + clean.slice(2);
  return clean;
}

export default function Checkout() {
  const { draft, user } = useStore();
  const isCustomer = useRequireCustomer("/checkout");
  const [status, setStatus] = useState("idle"); // idle | processing | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Card form state
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });

  if (!isCustomer) return null;

  if (!draft && !result) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">No booking in progress</h1>
        <Link to="/search" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Search flights
        </Link>
      </div>
    );
  }

  // ---- SUCCESS STATE ----
  if (result) {
    const fare = result.fareBreakdown || result.totals;
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-success/20">
          <CheckCircle2 className="size-10 text-success" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold">Booking Confirmed! 🎉</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your e-ticket is ready. Check your email for confirmation.
        </p>

        <div className="soft-card mt-6 space-y-3 p-5 text-left text-sm">
          <Row label="Booking Reference" value={<span className="font-mono font-bold text-primary">{result.bookingRef}</span>} />
          <Row label="Transaction ID" value={result.transactionId} />
          <Row label="Flight" value={`${result.flight?.flightNumber} · ${result.flight?.fromCode} → ${result.flight?.toCode}`} />
          <Row label="Travel Date" value={result.travelDate} />
          <Row label="Seat" value={result.seat || "Assigned at gate"} />
          <Row label="Passengers" value={result.passengerCount} />
          <Row label="Total Paid" value={<span className="font-bold text-primary">{currency(fare?.total || 0)}</span>} />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/ticket/$bookingId"
            params={{ bookingId: result.bookingRef }}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            View E-Ticket & Boarding Pass
          </Link>
          <Link to="/trips" className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary">
            My Trips
          </Link>
        </div>
      </div>
    );
  }

  // ---- BOOKING FORM ----
  const totals = estimateTotals(draft);

  async function handlePay() {
    // Basic card validation
    if (card.number.replace(/\s/g, "").length < 13) {
      setErrorMsg("Please enter a valid card number.");
      return;
    }
    if (!card.name.trim()) {
      setErrorMsg("Please enter the name on card.");
      return;
    }
    if (card.expiry.replace(/\D/g, "").length < 4) {
      setErrorMsg("Please enter a valid expiry date.");
      return;
    }
    if (card.cvv.replace(/\D/g, "").length < 3) {
      setErrorMsg("Please enter a valid CVV.");
      return;
    }

    setErrorMsg("");
    setStatus("processing");

    try {
      const confirmed = await store.confirmBooking({ cardDetails: card });
      setResult(confirmed);
      setStatus("done");
    } catch (err) {
      console.error("Payment failed:", err);
      setErrorMsg(err.message || "Payment failed. Please try again.");
      setStatus("error");
    }
  }

  const cardType = detectCardType(card.number);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <span>Passengers</span>
        <ChevronRight className="size-3.5" />
        <span>Seats</span>
        <ChevronRight className="size-3.5" />
        <span>Baggage</span>
        <ChevronRight className="size-3.5" />
        <span className="text-primary">Payment</span>
      </div>

      <h1 className="font-display text-2xl font-bold sm:text-3xl">Booking Summary & Payment</h1>
      <p className="text-sm text-muted-foreground">Review your booking, then pay securely.</p>

      <div className="mt-6 space-y-5">
        {/* Booking summary */}
        {totals && (
          <BookingSummary
            flight={draft.flight}
            passengers={draft.passengers}
            seat={draft.seat}
            totals={totals}
          />
        )}

        {/* Passenger summary */}
        {draft.passengerDetails && draft.passengerDetails.length > 0 && (
          <div className="soft-card p-5">
            <h2 className="font-display text-base font-bold mb-3">Passengers</h2>
            <div className="space-y-2">
              {draft.passengerDetails.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.firstName} {p.lastName}</span>
                  <span className="text-xs rounded-full bg-secondary px-2 py-0.5 font-semibold capitalize">{p.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment card */}
        <div className="soft-card space-y-5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <CreditCard className="size-4" /> Payment
            </h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="size-3" /> Secure & encrypted
            </div>
          </div>

          {/* Card number */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Card Number
            </label>
            <div className="relative">
              <input
                id="card-number"
                value={card.number}
                onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 pr-16 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-muted-foreground">
                {cardType === "visa" ? "VISA" : cardType === "mastercard" ? "MC" : cardType === "amex" ? "AMEX" : cardType === "rupay" ? "RuPay" : ""}
              </span>
            </div>
          </div>

          {/* Name on card */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Name on Card
            </label>
            <input
              id="card-name"
              value={card.name}
              onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
              placeholder={user ? user.name : "Full name as printed"}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Expiry */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Expiry
              </label>
              <input
                id="card-expiry"
                value={card.expiry}
                onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                placeholder="MM / YY"
                maxLength={7}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>

            {/* CVV */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                CVV
              </label>
              <input
                id="card-cvv"
                type="password"
                value={card.cvv}
                onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                placeholder="•••"
                maxLength={4}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Pay button */}
          <button
            id="pay-button"
            onClick={handlePay}
            disabled={status === "processing"}
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:opacity-60"
          >
            {status === "processing" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Processing payment…
              </>
            ) : (
              <>
                <Lock className="size-4" />
                Pay {totals ? currency(totals.total) : ""} — Confirm Booking
              </>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            🔒 Demo mode — no real card charge. Use any card number.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
