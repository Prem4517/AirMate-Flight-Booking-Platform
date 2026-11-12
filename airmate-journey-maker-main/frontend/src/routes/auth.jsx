import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/pages/Auth.jsx";

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : null,
  }),
  head: () => ({
    meta: [
      { title: "Login or register — AirMate" },
      { name: "description", content: "Sign in to AirMate to manage bookings, seats, baggage and e-tickets." },
      { property: "og:title", content: "Login or register — AirMate" },
      { property: "og:description", content: "Access your AirMate trips, boarding passes and delay alerts." },
    ],
  }),
  component: Auth,
});
