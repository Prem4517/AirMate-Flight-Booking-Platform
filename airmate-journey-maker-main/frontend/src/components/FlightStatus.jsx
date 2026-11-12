import { useState } from "react";
import { Plane, Clock, AlertCircle, CheckCircle2, X } from "lucide-react";
import { fetchFlightStatus } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function FlightStatusPanel() {
  const [flightNumber, setFlightNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(() => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("airmate_flight_history") : null;
      return stored ? JSON.parse(stored) : ["AM-501", "6E-532", "AI-101"];
    } catch {
      return ["AM-501", "6E-532", "AI-101"];
    }
  });

  const handleSearchWithNumber = async (num) => {
    const fn = (num || flightNumber).trim();
    if (!fn) return;
    setFlightNumber(fn);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchFlightStatus(fn, date);
      setResult(data);
      setHistory((prev) => {
        const next = [fn, ...prev.filter((x) => x !== fn)].slice(0, 5);
        try {
          localStorage.setItem("airmate_flight_history", JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch (err) {
      setError(err.message || "Failed to fetch flight status");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    handleSearchWithNumber(flightNumber);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "on time":
        return "text-emerald-600";
      case "delayed":
        return "text-amber-600";
      case "cancelled":
        return "text-red-600";
      case "departed":
        return "text-blue-600";
      case "arrived":
        return "text-emerald-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "on time":
        return <CheckCircle2 className="size-5" />;
      case "delayed":
        return <AlertCircle className="size-5" />;
      case "cancelled":
        return <X className="size-5" />;
      default:
        return <Clock className="size-5" />;
    }
  };

  const flight = result?.flight;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Flight Number</label>
          <Input
            placeholder="e.g., AM-501, AM-204, 6E-532"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
            className="uppercase"
          />
          {history.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2 text-xs text-muted-foreground">
              <span className="text-[11px] font-medium flex items-center gap-1">
                <Clock className="size-3" /> Recent:
              </span>
              {history.map((fn) => (
                <button
                  key={fn}
                  type="button"
                  onClick={() => handleSearchWithNumber(fn)}
                  className="rounded-lg border border-border px-2 py-0.5 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  {fn}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Travel Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <Button type="submit" className="w-full" disabled={loading || !flightNumber.trim()}>
          {loading ? "Searching..." : "Check Flight Status"}
        </Button>
      </form>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {flight && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Flight</p>
                <p className="text-lg font-bold">{flight.flightNumber}</p>
              </div>
              <div className={`flex items-center gap-2 font-semibold ${getStatusColor(flight.status)}`}>
                {getStatusIcon(flight.status)}
                {flight.status}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-muted-foreground">Airline</p>
                <p className="font-medium">{flight.airline}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Aircraft</p>
                <p className="font-medium">{flight.aircraft}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Scheduled departure</p>
                <p className="font-medium">
                  {flight.from} ({flight.fromCode})
                </p>
                <p className="text-xs text-muted-foreground">
                  {flight.scheduledDeparture || flight.departure}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Scheduled arrival</p>
                <p className="font-medium">
                  {flight.to} ({flight.toCode})
                </p>
                <p className="text-xs text-muted-foreground">
                  {flight.scheduledArrival || flight.arrival}
                </p>
              </div>
            </div>

            {flight.delayMinutes > 0 ? (
              <div className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                Delay: {flight.delayMinutes} minutes
                {flight.delayVerified ? " · Verified from schedule data" : " · Estimated from demo status"}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No delay recorded for this schedule.</p>
            )}

            {flight.statusDetails ? (
              <p className="border-t pt-2 text-sm text-muted-foreground">{flight.statusDetails}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            Data source: {result.dataSource}
            {!result.isLive ? " · Demo / scheduled data (live airline feed unavailable)" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

export function FlightStatusDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="size-5 text-primary" />
            Flight Status Check
          </DialogTitle>
        </DialogHeader>
        <FlightStatusPanel />
      </DialogContent>
    </Dialog>
  );
}
