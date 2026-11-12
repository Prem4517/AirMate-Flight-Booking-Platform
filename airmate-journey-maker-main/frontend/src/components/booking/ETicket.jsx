import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Plane, Users } from "lucide-react";
import { currency } from "@/data/flights";

export default function ETicket({ booking }) {
  const [qr, setQr] = useState("");
  const flight = booking.flight || {};

  // Support both new (bookingRef) and old (bookingId) schemas
  const ref = booking.bookingRef || booking.bookingId || "N/A";
  const txn = booking.transactionId || "N/A";
  const seat = booking.seat || "Assigned at gate";
  const totalPaid = booking.fareBreakdown?.total ?? booking.totals?.total ?? 0;
  const cabinClass = booking.cabinClass || flight.cabinClass || "Economy";

  // Lead passenger name
  const leadPassenger = booking.passengers && booking.passengers.length > 0
    ? `${booking.passengers[0].firstName} ${booking.passengers[0].lastName}`
    : (booking.passengerName || booking.contact?.name || "Passenger");

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(
      `AIRMATE|${ref}|${flight.flightNumber || ""}|${flight.fromCode || ""}-${flight.toCode || ""}|${seat}`,
      { margin: 1, width: 240, color: { dark: "#12356b", light: "#ffffff" } },
    )
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [booking, flight, ref, seat]);

  return (
    <div className="soft-card overflow-hidden print:shadow-none">
      {/* Header */}
      <div className="sky-panel flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-display text-lg font-bold">
          <Plane className="size-5 -rotate-45" /> AirMate Boarding Pass
        </div>
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
          {flight.flightNumber || "—"}
        </span>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-6">
          {/* Route */}
          <div className="flex items-end gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">From</p>
              <p className="font-display text-4xl font-extrabold">{flight.fromCode || "—"}</p>
              <p className="text-sm text-muted-foreground">{flight.from} · {flight.departure}</p>
            </div>
            <Plane className="mb-5 size-5 rotate-0 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">To</p>
              <p className="font-display text-4xl font-extrabold">{flight.toCode || "—"}</p>
              <p className="text-sm text-muted-foreground">{flight.to} · {flight.arrival}</p>
            </div>
          </div>

          {/* Details grid */}
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Item label="Lead Passenger" value={leadPassenger} />
            <Item label="Passengers" value={
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {booking.passengerCount || 1}
              </span>
            } />
            <Item label="Travel Date" value={booking.travelDate || "—"} />
            <Item label="Seat" value={seat} />
            <Item label="Cabin Class" value={cabinClass} />
            <Item label="Gate" value={flight.gate || "—"} />
            <Item label="Terminal" value={flight.terminal || flight.fromTerminal || "—"} />
            <Item label="Baggage" value={
              booking.baggage
                ? `${booking.baggage.checkinKg}kg + ${booking.baggage.cabinKg}kg cabin`
                : `${flight.checkinKg || 15}kg check-in`
            } />
            <Item label="Total Paid" value={<span className="font-bold text-primary">{currency(totalPaid)}</span>} />
          </dl>

          {/* Booking reference */}
          <div className="rounded-xl bg-secondary/60 p-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
              <span><span className="font-bold">Booking Ref: </span><span className="font-mono text-primary">{ref}</span></span>
              <span><span className="font-bold">Transaction: </span><span className="font-mono">{txn}</span></span>
            </div>
          </div>
        </div>

        {/* QR code */}
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-5">
          {qr ? (
            <img src={qr} alt={`QR code for booking ${ref}`} className="size-40" />
          ) : (
            <div className="size-40 animate-pulse rounded-lg bg-secondary" />
          )}
          <p className="text-center text-xs text-muted-foreground">Scan at<br />security & boarding</p>
        </div>
      </div>

      {/* Passenger list for multi-pax */}
      {booking.passengers && booking.passengers.length > 1 && (
        <div className="border-t border-border/60 px-6 py-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">All Passengers</p>
          <div className="flex flex-wrap gap-3">
            {booking.passengers.map((p, i) => (
              <span key={i} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                {p.firstName} {p.lastName} <span className="text-muted-foreground">({p.type})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Item({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
