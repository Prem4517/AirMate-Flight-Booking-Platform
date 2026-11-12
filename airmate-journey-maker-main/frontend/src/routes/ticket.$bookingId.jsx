import { createFileRoute } from "@tanstack/react-router";
import Ticket from "@/pages/Ticket.jsx";

export const Route = createFileRoute("/ticket/$bookingId")({
  head: () => ({
    meta: [
      { title: "Your e-ticket — AirMate" },
      { name: "description", content: "Your AirMate boarding pass with seat, gate, terminal and scannable QR code." },
      { property: "og:title", content: "Your e-ticket — AirMate" },
      { property: "og:description", content: "Download or scan your AirMate boarding pass at the airport." },
    ],
  }),
  component: TicketRouteComponent,
});

function TicketRouteComponent() {
  const { bookingId } = Route.useParams();
  return <Ticket bookingId={bookingId} />;
}
