import { createFileRoute } from "@tanstack/react-router";
import Baggage from "@/pages/Baggage.jsx";

export const Route = createFileRoute("/baggage")({
  head: () => ({
    meta: [
      { title: "Baggage add-ons — AirMate" },
      { name: "description", content: "Add check-in and cabin baggage and see excess charges before you pay." },
      { property: "og:title", content: "Baggage add-ons — AirMate" },
      { property: "og:description", content: "Transparent excess baggage pricing calculated instantly." },
    ],
  }),
  component: Baggage,
});
