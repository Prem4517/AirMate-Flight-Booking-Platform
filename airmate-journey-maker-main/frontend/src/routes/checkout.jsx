import { createFileRoute } from "@tanstack/react-router";
import Checkout from "@/pages/Checkout.jsx";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Booking summary & payment — AirMate" },
      { name: "description", content: "Review your fare, seat, baggage and taxes, then complete a secure mock payment." },
      { property: "og:title", content: "Booking summary & payment — AirMate" },
      { property: "og:description", content: "Full fare breakdown with instant confirmation and booking ID." },
    ],
  }),
  component: Checkout,
});
