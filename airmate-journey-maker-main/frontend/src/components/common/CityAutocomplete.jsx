import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Plane, Check, X, ChevronDown } from "lucide-react";
import { cities } from "@/data/flights";

export default function CityAutocomplete({
  label,
  value,
  onChange,
  exclude,
  warning,
  placeholder = "Search city or airport code",
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    const currentVal = (value || "").trim().toLowerCase();

    // If query is empty OR unchanged from current selected value, show ALL cities
    if (!q || q === currentVal) {
      return cities;
    }

    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.airport && c.airport.toLowerCase().includes(q))
    );
  }, [query, value]);

  function pick(city) {
    onChange(city.name);
    setQuery(city.name);
    setOpen(false);
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  const selectedCityObj = useMemo(
    () =>
      cities.find(
        (c) =>
          c.name.toLowerCase() === (value || "").toLowerCase() ||
          c.code.toLowerCase() === (value || "").toLowerCase()
      ),
    [value]
  );

  return (
    <div className="relative block" ref={boxRef}>
      <span className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {selectedCityObj ? (
          <span className="font-mono text-[11px] font-bold text-primary">
            [{selectedCityObj.code}]
          </span>
        ) : null}
      </span>

      <div
        onClick={() => {
          setOpen(true);
          if (inputRef.current) inputRef.current.focus();
        }}
        className={
          "relative flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5 transition-colors cursor-text focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 " +
          (warning ? "border-destructive/60" : "border-input")
        }
      >
        <MapPin className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={(e) => {
            setOpen(true);
            e.target.select();
          }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="w-full min-w-0 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
        />

        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Clear city"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <ChevronDown
            className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}

        {selectedCityObj ? (
          <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[11px] font-bold text-secondary-foreground">
            {selectedCityObj.code}
          </span>
        ) : null}
      </div>

      {warning ? (
        <p className="mt-1 text-xs font-medium text-destructive">{warning}</p>
      ) : null}

      {open ? (
        <div className="absolute left-0 right-0 top-full z-[100] mt-1.5 max-h-72 min-w-[280px] overflow-auto rounded-2xl border border-border bg-card p-1.5 shadow-2xl backdrop-blur-md">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Available Cities & Airports ({matches.length})
          </div>
          {matches.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              No airports found matching "{query}"
            </div>
          ) : (
            matches.map((c) => {
              const isExcluded =
                exclude &&
                (c.name.toLowerCase() === exclude.toLowerCase() ||
                  c.code.toLowerCase() === exclude.toLowerCase());
              const isSelected =
                value &&
                (c.name.toLowerCase() === value.toLowerCase() ||
                  c.code.toLowerCase() === value.toLowerCase());

              return (
                <button
                  key={c.code}
                  type="button"
                  disabled={isExcluded}
                  onClick={() => pick(c)}
                  className={
                    "group flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-colors " +
                    (isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-secondary") +
                    (isExcluded ? " opacity-40 cursor-not-allowed" : "")
                  }
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                      <Plane className="size-3.5 -rotate-45" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-foreground">
                          {c.name}
                        </span>
                        <span className="rounded bg-secondary/80 px-1 py-0.2 font-mono text-[10px] font-bold text-muted-foreground">
                          {c.code}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {c.airport || `${c.name} Airport`}
                      </p>
                    </div>
                  </div>

                  {isSelected ? (
                    <Check className="size-4 shrink-0 text-primary" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
