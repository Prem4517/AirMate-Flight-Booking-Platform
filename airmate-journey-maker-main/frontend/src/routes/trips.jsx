import { createFileRoute } from "@tanstack/react-router";
import Trips from "@/pages/Trips.jsx";

export const Route = createFileRoute("/trips")({
  head: () => ({
    meta: [
      { title: "My trips — AirMate" },
      { name: "description", content: "Track your AirMate bookings with live status, gate, terminal and delay risk predictions." },
      { property: "og:title", content: "My trips — AirMate" },
      { property: "og:description", content: "Every booking with status, gate info and a mock delay-risk score." },
    ],
  }),
  component: Trips,
});
