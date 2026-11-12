import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plane } from "lucide-react";
import FlightStatusPanel from "@/components/FlightStatus.jsx";

export default function FlightStatusPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to Home
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
          <Plane className="size-5 -rotate-45" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">Check flight status</h1>
          <p className="text-sm text-muted-foreground">
            Enter a flight number and travel date. No account is required.
          </p>
        </div>
      </div>

      <div className="mt-6 soft-card p-5 sm:p-6">
        <FlightStatusPanel />
      </div>
    </div>
  );
}
