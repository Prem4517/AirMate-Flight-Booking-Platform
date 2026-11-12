import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import ETicket from "@/components/booking/ETicket";
import { useStore } from "@/lib/store";
import { fetchBookingByRef } from "@/services/api";
import useRequireCustomer from "@/lib/useRequireCustomer";

export default function Ticket({ bookingId }) {
  const { bookings } = useStore();
  const isCustomer = useRequireCustomer(`/ticket/${bookingId}`);
  const [remoteBooking, setRemoteBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // bookingId here is the bookingRef (e.g. "AMXYZ123")
  const localBooking = bookings.find(
    (b) => b.bookingRef === bookingId || b.bookingId === bookingId
  );
  const booking = localBooking || remoteBooking;

  useEffect(() => {
    if (isCustomer && !localBooking && bookingId) {
      setLoading(true);
      setError("");
      fetchBookingByRef(bookingId)
        .then((data) => {
          if (data) setRemoteBooking(data);
          else setError("Booking not found. It may have expired or the reference is incorrect.");
        })
        .catch((err) => {
          if (err.message.includes("Access denied")) {
            setError("You don't have permission to view this booking.");
          } else {
            setError("Could not load booking details. Please try again.");
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isCustomer, localBooking, bookingId]);

  if (!isCustomer) return null;

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Loading your e-ticket…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-destructive">Ticket Error</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Link to="/trips" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          My Trips
        </Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Ticket not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This booking could not be found. Book a flight to generate a new e-ticket.
        </p>
        <Link to="/search" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Search flights
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold sm:text-3xl">Your E-Ticket</h1>
      <ETicket booking={booking} />
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => window.print()}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
        >
          Print Ticket
        </button>
        <Link to="/trips" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          My Trips
        </Link>
      </div>
    </div>
  );
}
