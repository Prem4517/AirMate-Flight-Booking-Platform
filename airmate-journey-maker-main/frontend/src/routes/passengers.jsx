import { createFileRoute } from "@tanstack/react-router";
import PassengerDetails from "@/pages/PassengerDetails.jsx";

export const Route = createFileRoute("/passengers")({
  validateSearch: (search) => ({
    flightId: typeof search.flightId === "string" ? search.flightId : "",
    date: typeof search.date === "string" ? search.date : "",
    passengers: Number(search.passengers) || 1,
    cabinClass: typeof search.cabinClass === "string" ? search.cabinClass : "Economy",
  }),
  head: () => ({
    meta: [
      { title: "Passenger Details — AirMate" },
      { name: "description", content: "Enter passenger details for your flight booking." },
    ],
  }),
  component: PassengerDetails,
});
