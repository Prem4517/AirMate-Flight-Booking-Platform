import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/Home.jsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AirMate — Book flights across India in minutes" },
      {
        name: "description",
        content:
          "Search flights, pick your seat, manage baggage and track delays with AirMate's smart booking platform for Indian routes.",
      },
      { property: "og:title", content: "AirMate — Smart flight booking" },
      {
        property: "og:description",
        content: "Compare fares, get AI-style flight recommendations and manage every trip in one place.",
      },
    ],
  }),
  component: Home,
});
