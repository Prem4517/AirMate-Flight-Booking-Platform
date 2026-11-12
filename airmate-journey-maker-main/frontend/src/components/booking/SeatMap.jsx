import { useState, useEffect, useMemo } from "react";
import { fetchFlightSeats } from "@/services/api";

const COLS = ["A", "B", "C", "D", "E", "F"];

export function buildSeats(flight, rows = 12) {
  const seed = flight ? (flight.id || "").length + (flight.price || 0) : 7;
  const occupied = new Set();
  for (let r = 1; r <= rows; r++) {
    for (let c = 0; c < COLS.length; c++) {
      const n = (r * 31 + c * 17 + seed) % 10;
      if (n < 4) occupied.add(`${r}${COLS[c]}`);
    }
  }
  return occupied;
}

export default function SeatMap({ flight, selected, onSelect, rows = 12 }) {
  const [dbSeats, setDbSeats] = useState(null);

  useEffect(() => {
    if (!flight || (!flight.id && !flight._id)) return;
    const fId = flight.id || flight._id;
    fetchFlightSeats(fId)
      .then((data) => {
        if (data && Array.isArray(data.seats)) {
          setDbSeats(data.seats);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch DB seats, falling back to local calculation:", err.message);
      });
  }, [flight]);

  const occupied = useMemo(() => {
    if (dbSeats && dbSeats.length > 0) {
      const set = new Set();
      dbSeats.forEach((s) => {
        if (s.isBooked || !s.isAvailable) {
          set.add(s.seatNumber);
        }
      });
      return set;
    }
    return buildSeats(flight, rows);
  }, [dbSeats, flight, rows]);

  return (
    <div className="soft-card p-4 sm:p-6">
      <div className="mx-auto max-w-md">
        <div className="mb-6 h-10 rounded-t-[999px] border-b-2 border-dashed border-border bg-secondary/60 text-center text-xs leading-10 text-muted-foreground">
          Nose of aircraft · {flight ? flight.aircraft : "Cabin"}
        </div>

        <div className="flex justify-center gap-6 text-[11px] text-muted-foreground">
          <div className="grid grid-cols-3 gap-2">{COLS.slice(0, 3).map((c) => <span key={c} className="w-9 text-center">{c}</span>)}</div>
          <div className="grid grid-cols-3 gap-2">{COLS.slice(3).map((c) => <span key={c} className="w-9 text-center">{c}</span>)}</div>
        </div>

        <div className="mt-2 space-y-2">
          {Array.from({ length: rows }, (_, i) => i + 1).map((row) => (
            <div key={row} className="flex items-center justify-center gap-6">
              <div className="grid grid-cols-3 gap-2">
                {COLS.slice(0, 3).map((c) => (
                  <Seat key={c} id={`${row}${c}`} occupied={occupied.has(`${row}${c}`)} selected={selected === `${row}${c}`} onSelect={onSelect} />
                ))}
              </div>
              <span className="w-4 text-center text-[11px] text-muted-foreground">{row}</span>
              <div className="grid grid-cols-3 gap-2">
                {COLS.slice(3).map((c) => (
                  <Seat key={c} id={`${row}${c}`} occupied={occupied.has(`${row}${c}`)} selected={selected === `${row}${c}`} onSelect={onSelect} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <Legend className="bg-card border border-border" label="Available" />
          <Legend className="bg-primary" label="Selected" />
          <Legend className="bg-muted-foreground/30" label="Occupied" />
        </div>
      </div>
    </div>
  );
}

function Legend({ className, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={"size-4 rounded-md " + className} /> {label}
    </span>
  );
}

function Seat({ id, occupied, selected, onSelect }) {
  return (
    <button
      type="button"
      disabled={occupied}
      onClick={() => onSelect(id)}
      aria-label={`Seat ${id}`}
      className={
        "size-9 rounded-lg text-[11px] font-semibold transition-transform " +
        (occupied
          ? "cursor-not-allowed bg-muted-foreground/25 text-muted-foreground"
          : selected
            ? "bg-primary text-primary-foreground scale-105"
            : "border border-border bg-card hover:border-primary hover:text-primary")
      }
    >
      {id}
    </button>
  );
}
