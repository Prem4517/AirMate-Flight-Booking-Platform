import { createFileRoute } from "@tanstack/react-router";
import RecommendedFlights from "@/pages/RecommendedFlights.jsx";

export const Route = createFileRoute("/recommendations")({
  validateSearch: (search) => ({
    from: search.from || "",
    to: search.to || "",
    date: search.date || "",
    returnDate: search.returnDate || "",
    tripType: search.tripType || "oneway",
    passengers: Number(search.passengers) || 1,
    cabinClass: search.cabinClass || "Economy",
    sortBy: search.sortBy || "value",
  }),
  head: () => ({
    meta: [
      { title: "Recommended Flights — AirMate" },
      {
        name: "description",
        content: "Explore recommended flights by price, duration, departure time, and overall value. No login required.",
      },
    ],
  }),
  component: RecommendationsRoute,
});

function RecommendationsRoute() {
  const search = Route.useSearch();
  return <RecommendedFlights search={search} />;
}
