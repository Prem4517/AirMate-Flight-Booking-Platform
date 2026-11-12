import { useState, useEffect } from "react";
import {
  Ticket,
  Search,
  Download,
  Filter,
  Eye,
  RotateCcw,
  Ban,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  ShieldAlert,
  CreditCard,
  X,
  Loader2,
  Copy,
  Calendar,
} from "lucide-react";
import {
  fetchAdminBookings,
  fetchAdminBookingDetail,
  updateBookingStatusAdmin,
  refundBookingAdmin,
  downloadAdminCsv,
} from "@/services/api";
import ConfirmationDialog from "./ConfirmationDialog";
import { toast } from "sonner";

export default function AdminBookingsTab({ onRefreshMetrics }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [bookingStatus, setBookingStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected booking detail modal
  const [selectedRef, setSelectedRef] = useState(null);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    description: "",
    variant: "danger",
    onConfirm: () => {},
  });

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminBookings({
        query,
        bookingStatus,
        paymentStatus,
        startDate,
        endDate,
        page,
        limit: 12,
      });
      setBookings(data.bookings || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      toast.error(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [query, bookingStatus, paymentStatus, startDate, endDate, page]);

  // View booking detail
  const handleOpenDetail = async (ref) => {
    setSelectedRef(ref);
    setDetailLoading(true);
    try {
      const detail = await fetchAdminBookingDetail(ref);
      setBookingDetail(detail);
    } catch (err) {
      toast.error(err.message || "Failed to fetch booking manifest");
    } finally {
      setDetailLoading(false);
    }
  };

  // Issue Refund with confirmation
  const promptRefund = (booking) => {
    setConfirmDialog({
      isOpen: true,
      title: `Issue Full Refund for ${booking.bookingRef}?`,
      description: `This will reverse the payment of ₹${(
        booking.fareBreakdown?.total || 0
      ).toLocaleString(
        "en-IN"
      )}, mark the payment as Refunded, and cancel the passenger reservation. This action is irreversible.`,
      variant: "danger",
      confirmText: `Issue Refund (₹${(booking.fareBreakdown?.total || 0).toLocaleString("en-IN")})`,
      onConfirm: async () => {
        try {
          await refundBookingAdmin(booking.bookingRef, {
            reason: "Admin approved refund through operations portal",
          });
          toast.success(`Refund processed for ${booking.bookingRef}`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          if (bookingDetail?.bookingRef === booking.bookingRef) {
            handleOpenDetail(booking.bookingRef);
          }
          loadBookings();
          onRefreshMetrics?.();
        } catch (err) {
          toast.error(err.message || "Failed to process refund");
        }
      },
    });
  };

  // Cancel Booking with confirmation
  const promptCancelBooking = (booking) => {
    setConfirmDialog({
      isOpen: true,
      title: `Cancel Booking ${booking.bookingRef}?`,
      description: `The reservation status will be changed to Cancelled. Seat reservations will be released back to the aircraft inventory.`,
      variant: "warning",
      confirmText: "Cancel Reservation",
      onConfirm: async () => {
        try {
          await updateBookingStatusAdmin(booking.bookingRef, {
            bookingStatus: "cancelled",
            reason: "Cancelled by airline operations staff",
          });
          toast.success(`Booking ${booking.bookingRef} marked as Cancelled`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          if (bookingDetail?.bookingRef === booking.bookingRef) {
            handleOpenDetail(booking.bookingRef);
          }
          loadBookings();
          onRefreshMetrics?.();
        } catch (err) {
          toast.error(err.message || "Failed to cancel booking");
        }
      },
    });
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      await downloadAdminCsv("bookings");
      toast.success("Bookings CSV downloaded successfully");
    } catch (err) {
      toast.error(err.message || "Failed to export bookings");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.info(`Copied ${text} to clipboard`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Passenger Reservations & Manifests</h2>
          <p className="text-xs text-muted-foreground">
            Search booking references, audit passenger manifests, verify itemized fares, and manage refunds.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
        >
          <Download className="size-3.5" /> Export Bookings CSV
        </button>
      </div>

      {/* Filter and Date Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by reference (AM...), passenger name, email, flight..."
            className="w-full rounded-xl border border-border/80 bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Booking Status:</span>
          <select
            value={bookingStatus}
            onChange={(e) => {
              setBookingStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="all">All Bookings</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Payment:</span>
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/50 font-bold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Booking Ref</th>
                <th className="px-4 py-3">Flight / Route</th>
                <th className="px-4 py-3">Travel Date</th>
                <th className="px-4 py-3">Lead Passenger / Contact</th>
                <th className="px-4 py-3">Passengers</th>
                <th className="px-4 py-3">Total Fare</th>
                <th className="px-4 py-3">Booking Status</th>
                <th className="px-4 py-3">Payment Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                    <span className="mt-2 block">Loading booking records...</span>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-muted-foreground">
                    No bookings found matching criteria.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const leadName =
                    b.contact?.name ||
                    (b.passengers && b.passengers[0]
                      ? `${b.passengers[0].firstName} ${b.passengers[0].lastName}`
                      : "Passenger");

                  return (
                    <tr key={b.bookingRef} className="transition-colors hover:bg-secondary/30">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-primary">{b.bookingRef}</span>
                          <button
                            onClick={() => copyToClipboard(b.bookingRef)}
                            title="Copy Ref"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="size-3" />
                          </button>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ""}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground">
                          {b.flight?.flightNumber || "FLIGHT"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {b.flight?.fromCode || b.flight?.from} ➔ {b.flight?.toCode || b.flight?.to}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-foreground">
                        {b.travelDate}
                        <div className="text-[10px] text-muted-foreground">{b.cabinClass || "Economy"}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground">{leadName}</div>
                        <div className="text-[11px] text-muted-foreground">{b.contact?.email}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="rounded-md bg-secondary px-2 py-0.5 font-bold text-foreground">
                          {b.passengerCount || (b.passengers ? b.passengers.length : 1)} pax
                        </span>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          Seats: {(b.seats || [b.seat]).filter(Boolean).join(", ") || "Unassigned"}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-extrabold text-foreground">
                        ₹{(b.fareBreakdown?.total || b.totalAmount || 0).toLocaleString("en-IN")}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            b.bookingStatus === "confirmed"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : b.bookingStatus === "cancelled"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {b.bookingStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            b.paymentStatus === "paid"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : b.paymentStatus === "refunded"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : b.paymentStatus === "pending"
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {b.paymentStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {b.bookingStatus === "cancelled" && b.paymentStatus !== "refunded" && (
                            <button
                              onClick={() => promptRefund(b)}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/25"
                              title="Approve cancellation and credit refund"
                            >
                              <RotateCcw className="size-3" /> Approve Refund
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenDetail(b.bookingRef)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/40 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
                          >
                            <Eye className="size-3.5" /> Manifest
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            Showing {bookings.length} of {totalCount} reservations
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-secondary disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-semibold text-foreground">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-secondary disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Booking Detail & Manifest Modal */}
      {selectedRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">Reservation Manifest</h3>
                  <span className="font-mono text-sm font-extrabold text-primary">
                    {selectedRef}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Verified server-side itinerary, transparent fare breakdown, and passenger records.
                </p>
              </div>
              <button onClick={() => setSelectedRef(null)}>
                <X className="size-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {detailLoading || !bookingDetail ? (
              <div className="py-16 text-center text-muted-foreground">
                <Loader2 className="mx-auto size-7 animate-spin text-primary" />
                <span className="mt-2 block">Loading manifest...</span>
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                {/* Flight & Itinerary Banner */}
                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold uppercase text-primary">Flight Itinerary</span>
                      <h4 className="text-base font-bold text-foreground">
                        {bookingDetail.flight?.flightNumber} · {bookingDetail.flight?.airline}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {bookingDetail.flight?.from} ({bookingDetail.flight?.fromCode}) ➔{" "}
                        {bookingDetail.flight?.to} ({bookingDetail.flight?.toCode})
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-semibold text-muted-foreground">Travel Date</div>
                      <div className="text-sm font-bold text-foreground">{bookingDetail.travelDate}</div>
                      <div className="text-xs text-muted-foreground">
                        {bookingDetail.flight?.departure} – {bookingDetail.flight?.arrival} ·{" "}
                        {bookingDetail.cabinClass}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passenger Manifest Table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Passenger Manifest ({bookingDetail.passengers?.length || 1})
                  </h4>
                  <div className="mt-2 overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-secondary/50 font-bold text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Passenger Name</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Gender</th>
                          <th className="px-3 py-2">DOB</th>
                          <th className="px-3 py-2">Nationality</th>
                          <th className="px-3 py-2">Assigned Seat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {bookingDetail.passengers?.map((p, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-bold text-foreground">
                              {p.firstName} {p.lastName}
                            </td>
                            <td className="px-3 py-2 capitalize">{p.type || "Adult"}</td>
                            <td className="px-3 py-2 capitalize">{p.gender || "—"}</td>
                            <td className="px-3 py-2">{p.dateOfBirth || "—"}</td>
                            <td className="px-3 py-2">{p.nationality || "Indian"}</td>
                            <td className="px-3 py-2 font-mono font-bold text-primary">
                              {bookingDetail.seats?.[idx] || bookingDetail.seat || "Unassigned"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Server-Side Itemized Fare Breakdown */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Transparent Fare Breakdown (Calculated by Server)
                  </h4>
                  <div className="mt-2 grid grid-cols-2 gap-3 rounded-xl border border-border p-4 text-xs sm:grid-cols-4">
                    <div>
                      <span className="text-muted-foreground">Base Airfare:</span>
                      <p className="font-bold text-foreground">
                        ₹{(bookingDetail.fareBreakdown?.baseFare || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fuel Surcharge:</span>
                      <p className="font-bold text-foreground">
                        ₹{(bookingDetail.fareBreakdown?.fuelSurcharge || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Airport Taxes:</span>
                      <p className="font-bold text-foreground">
                        ₹{(bookingDetail.fareBreakdown?.airportTaxes || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">User Dev Fee (UDF):</span>
                      <p className="font-bold text-foreground">
                        ₹{(bookingDetail.fareBreakdown?.userDevelopmentFee || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Seat Reservation Fee:</span>
                      <p className="font-bold text-foreground">
                        ₹{(bookingDetail.fareBreakdown?.seatFee || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Baggage Add-on:</span>
                      <p className="font-bold text-foreground">
                        ₹{(bookingDetail.fareBreakdown?.baggageFee || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GST & Cess (9%):</span>
                      <p className="font-bold text-foreground">
                        ₹{(bookingDetail.fareBreakdown?.tax || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-2">
                      <span className="text-primary">Total Collected:</span>
                      <p className="text-sm font-extrabold text-primary">
                        ₹{(bookingDetail.fareBreakdown?.total || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment & Security Metadata */}
                <div className="rounded-xl border border-border p-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <span className="font-bold text-foreground">Payment & Settlement Information</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Gateway Intent: {bookingDetail.paymentIntentId || "demo_intent"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-muted-foreground">
                    <div>
                      <span>Payment Status:</span>
                      <p className="font-bold capitalize text-foreground">
                        {bookingDetail.paymentStatus}
                      </p>
                    </div>
                    <div>
                      <span>Payment Method:</span>
                      <p className="font-bold uppercase text-foreground">
                        {bookingDetail.paymentMethod || "Card"}
                      </p>
                    </div>
                    <div>
                      <span>Transaction ID:</span>
                      <p className="font-mono text-foreground">
                        {bookingDetail.transactionId || "txn_live_ok"}
                      </p>
                    </div>
                    <div>
                      <span>Settled At:</span>
                      <p className="text-foreground">
                        {bookingDetail.paidAt
                          ? new Date(bookingDetail.paidAt).toLocaleString()
                          : "Pending Gateway"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Administrative Operations Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="text-xs text-muted-foreground">
                    Eligibility:{" "}
                    {bookingDetail.paymentStatus === "refunded" ? (
                      <span className="font-bold text-purple-500">Already Refunded</span>
                    ) : (
                      <span className="font-bold text-emerald-500">Refund Eligible</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {bookingDetail.bookingStatus !== "cancelled" && (
                      <button
                        onClick={() => promptCancelBooking(bookingDetail)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10"
                      >
                        <Ban className="size-3.5" /> Cancel Reservation
                      </button>
                    )}

                    {bookingDetail.paymentStatus === "paid" && (
                      <button
                        onClick={() => promptRefund(bookingDetail)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700"
                      >
                        <RotateCcw className="size-3.5" /> Issue Full Refund
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
