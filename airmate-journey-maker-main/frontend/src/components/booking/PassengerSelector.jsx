import { useEffect, useRef, useState } from "react";
import { Users, Minus, Plus } from "lucide-react";

const ROWS = [
  { key: "adults", label: "Adults", hint: "12+ yrs", min: 1 },
  { key: "children", label: "Children", hint: "2–11 yrs", min: 0 },
  { key: "infants", label: "Infants", hint: "under 2", min: 0 },
];

export default function PassengerSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const total = value.adults + value.children + value.infants;

  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function step(key, delta) {
    const row = ROWS.find((r) => r.key === key);
    const next = { ...value, [key]: value[key] + delta };
    if (next[key] < row.min) return;
    if (next.infants > next.adults) return;
    const nextTotal = next.adults + next.children + next.infants;
    if (nextTotal < 1 || nextTotal > 9) return;
    onChange(next);
  }

  return (
    <div className="relative block" ref={boxRef}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Passengers
      </span>
      <div className="flex items-center gap-2 rounded-xl border border-input px-2 py-1.5">
        <button
          type="button"
          aria-label="Remove passenger"
          onClick={() => step(value.children > 0 ? "children" : value.infants > 0 ? "infants" : "adults", -1)}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 text-sm font-semibold"
        >
          <Users className="size-4 text-muted-foreground" />
          {total}
        </button>
        <button
          type="button"
          aria-label="Add passenger"
          onClick={() => step("adults", 1)}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {open ? (
        <div className="absolute z-30 mt-1 w-64 rounded-xl border border-border bg-card p-3 shadow-[var(--card-shadow)]">
          {ROWS.map((r) => (
            <div key={r.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.hint}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Fewer ${r.label}`}
                  onClick={() => step(r.key, -1)}
                  className="grid size-7 place-items-center rounded-lg border border-border"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-5 text-center text-sm font-semibold">{value[r.key]}</span>
                <button
                  type="button"
                  aria-label={`More ${r.label}`}
                  onClick={() => step(r.key, 1)}
                  className="grid size-7 place-items-center rounded-lg border border-border"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
          <p className="mt-1 text-xs text-muted-foreground">Up to 9 travellers per booking.</p>
        </div>
      ) : null}
    </div>
  );
}
