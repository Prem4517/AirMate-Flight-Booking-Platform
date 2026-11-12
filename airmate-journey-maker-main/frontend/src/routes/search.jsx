import { createFileRoute } from "@tanstack/react-router";
import Search from "@/pages/Search.jsx";

export const Route = createFileRoute("/search")({
  validateSearch: (search) => ({
    from: search.from || "",
    to: search.to || "",
    date: search.date || "",
    returnDate: search.returnDate || "",
    tripType: search.tripType || "oneway",
    passengers: Number(search.passengers) || 1,
    cabinClass: search.cabinClass || "Economy",
    maxPrice: search.maxPrice ? Number(search.maxPrice) : undefined,
    maxDuration: search.maxDuration ? Number(search.maxDuration) : undefined,
    airline: search.airline || "All",
    stops: search.stops || "all",
    departureWindow: search.departureWindow || "all",
    sortBy: search.sortBy || "cheapest",
    page: Number(search.page) || 1,
  }),
  head: () => ({
    meta: [
      { title: "Search flights — AirMate" },
      {
        name: "description",
        content: "Compare fares, filter by airline, price and duration, and get a best-for-you flight pick.",
      },
      { property: "og:title", content: "Search flights — AirMate" },
      {
        property: "og:description",
        content: "Smart flight results with recommendation scoring across price, duration and baggage.",
      },
    ],
  }),
  component: SearchRouteComponent,
});

function SearchRouteComponent() {
  const search = Route.useSearch();
  return <Search search={search} />;
}
