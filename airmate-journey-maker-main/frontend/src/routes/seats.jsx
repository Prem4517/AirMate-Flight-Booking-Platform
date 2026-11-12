import { createFileRoute } from "@tanstack/react-router";
import Seats from "@/pages/Seats.jsx";

export const Route = createFileRoute("/seats")({
  head: () => ({
    meta: [
      { title: "Choose your seat — AirMate" },
      { name: "description", content: "Pick a window or aisle seat on an interactive AirMate cabin map." },
      { property: "og:title", content: "Choose your seat — AirMate" },
      { property: "og:description", content: "Interactive seat map with live availability for your AirMate flight." },
    ],
  }),
  component: Seats,
});
