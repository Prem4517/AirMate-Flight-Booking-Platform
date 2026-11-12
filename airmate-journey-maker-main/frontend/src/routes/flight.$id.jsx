import { createFileRoute } from "@tanstack/react-router";
import FlightDetails from "@/pages/FlightDetails.jsx";

export const Route = createFileRoute("/flight/$id")({
  head: () => ({
    meta: [
      { title: "Flight Details & Fare Breakdown — AirMate" },
      {
        name: "description",
        content: "View flight schedule, aircraft details, baggage policy, cabin class upgrades, and transparent fare breakdown.",
      },
    ],
  }),
  component: FlightDetailsRouteComponent,
});

function FlightDetailsRouteComponent() {
  const { id } = Route.useParams();
  return <FlightDetails flightId={id} />;
}
