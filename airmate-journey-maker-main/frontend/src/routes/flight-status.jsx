import { createFileRoute } from "@tanstack/react-router";
import FlightStatusPage from "@/pages/FlightStatusPage.jsx";

export const Route = createFileRoute("/flight-status")({
  head: () => ({
    meta: [
      { title: "Flight Status — AirMate" },
      {
        name: "description",
        content: "Check public flight status, scheduled times, and delay information without signing in.",
      },
    ],
  }),
  component: FlightStatusPage,
});
