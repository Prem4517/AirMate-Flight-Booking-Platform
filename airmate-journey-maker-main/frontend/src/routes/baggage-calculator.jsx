import { createFileRoute } from "@tanstack/react-router";
import BaggageCalculator from "@/pages/BaggageCalculator.jsx";

export const Route = createFileRoute("/baggage-calculator")({
  head: () => ({
    meta: [
      { title: "Baggage Calculator — AirMate" },
      { name: "description", content: "Calculate baggage allowances and excess fees for your flight." },
      { property: "og:title", content: "Baggage Calculator — AirMate" },
      { property: "og:description", content: "Transparent excess baggage pricing calculated instantly." },
    ],
  }),
  component: BaggageCalculator,
});
