import { Link } from "@tanstack/react-router";
import BaggageCalculatorTab from "@/components/dashboard/BaggageCalculatorTab";
import { Luggage, ArrowLeft } from "lucide-react";

export default function BaggageCalculator() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to Home
            </Link>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Luggage className="size-5" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold">Baggage Calculator</h1>
                <p className="text-xs text-muted-foreground">Calculate excess baggage fees before you travel</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <BaggageCalculatorTab />
      </main>
    </div>
  );
}
