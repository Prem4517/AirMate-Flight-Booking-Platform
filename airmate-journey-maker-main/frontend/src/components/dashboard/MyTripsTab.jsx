import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plane,
  Clock,
  DoorOpen,
  MapPin,
  Ticket,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Ban,
  Activity,
  Download,
  IndianRupee,
  RefreshCw,
  Info,
  Calendar,
  User,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { currency, delayPrediction } from "@/data/flights";
import {
  cancelCustomerBooking,
  fetchBookingTimeline,
  fetchBookingRefundStatus,
} from "@/services/api";
import { toast } from "sonner";

export default function MyTripsTab({ bookings = [], loading = false, onRefresh = () => {} }) {
  const [filter, setFilter] = useState("upcoming"); // upcoming, completed, cancelled, all
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [fareModalOpen, setFareModalOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [timelineData, setTimelineData] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingRef, setCancellingRef] = useState(null);
  const [cancelReason, setCancelReason] = useState("Change of travel plans");
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundData, setRefundData] = useState(null);
  const [loadingRefund, setLoadingRefund] = useState(false);

  // Categorize bookings
  const todayStr = new Date().toISOString().split("T")[0];

  const filteredBookings = bookings.filter((b) => {
    const isCancelled = b.bookingStatus === "cancelled";
    const travelDate = b.travelDate || "";
    const isPast = travelDate < todayStr;

    if (filter === "cancelled") return isCancelled;
    if (filter === "completed") return !isCancelled && isPast;
    if (filter === "upcoming") return !isCancelled && !isPast;
    return true; // all
  });

  const handleOpenTimeline = async (booking) => {
    setSelectedBooking(booking);
    setTimelineModalOpen(true);
    setLoadingTimeline(true);
    try {
      const data = await fetchBookingTimeline(booking.bookingRef);
      setTimelineData(data);
    } catch (err) {
      toast.error(err.message || "Failed to load booking timeline");
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleOpenRefund = async (booking) => {
    setSelectedBooking(booking);
    setRefundModalOpen(true);
    setLoadingRefund(true);
    try {
      const data = await fetchBookingRefundStatus(booking.bookingRef);
      setRefundData(data);
    } catch (err) {
      toast.error(err.message || "Failed to load refund status");
    } finally {
      setLoadingRefund(false);
    }
  };

  const handleOpenCancel = (booking) => {
    setCancellingRef(booking.bookingRef);
    setSelectedBooking(booking);
    setCancelReason("Change of travel plans");
    setCancelModalOpen(true);
  };

  const submitCancellation = async () => {
    if (!cancellingRef) return;
    setSubmittingCancel(true);
    try {
      const res = await cancelCustomerBooking(cancellingRef, cancelReason);
      toast.success(res.message || "Cancellation requested. Awaiting administrator approval before refund is credited.");
      setCancelModalOpen(false);
      onRefresh();
    } catch (err) {
      toast.error(err.message || "Cancellation failed");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleDownloadTicket = (booking) => {
    toast.info(`Preparing boarding pass for PNR ${booking.bookingRef}...`);
    window.open(`/ticket/${booking.bookingRef}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/30 p-1">
          {[
            { id: "upcoming", label: "Upcoming Trips" },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
            { id: "all", label: "All Bookings" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                filter === tab.id
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <RefreshCw className="size-3.5" /> Refresh Trips
        </button>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="soft-card h-48 animate-pulse p-6 bg-secondary/30" />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="soft-card p-12 text-center">
          <Plane className="mx-auto size-12 -rotate-45 text-muted-foreground/40" />
          <h3 className="mt-4 font-display text-lg font-bold">No {filter} trips found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === "upcoming"
              ? "You do not have any upcoming flights scheduled. Discover destinations and book today!"
              : `No ${filter} bookings recorded in your account.`}
          </p>
          <div className="mt-6">
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95"
            >
              Explore Flights <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const flight = b.flight || {};
            const d = delayPrediction(flight);
            const ref = b.bookingRef || b.bookingId;
            const total = b.fareBreakdown?.total || b.totalAmount || 0;
            const bStatus = b.bookingStatus || "confirmed";
            const pStatus = b.paymentStatus || "paid";

            const isCancelled = bStatus === "cancelled";
            const statusTone = isCancelled
              ? "bg-destructive/15 text-destructive border-destructive/20"
              : bStatus === "confirmed"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-warning/20 text-warning-foreground border-warning/30";

            const paymentTone =
              pStatus === "paid"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : pStatus === "refunded"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "bg-warning/15 text-warning-foreground";

            return (
              <article
                key={ref || b._id}
                className="soft-card relative overflow-hidden p-5 sm:p-6 transition-all hover:border-primary/40"
              >
                {/* Header: Route, Flight Info, Status Badges */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-extrabold uppercase text-primary">
                        {flight.airline || "AirMate Express"}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {flight.flightNumber}
                      </span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-xs text-muted-foreground">{b.cabinClass || "Economy"}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      <div>
                        <h3 className="font-display text-2xl font-black text-foreground">
                          {flight.fromCode}
                        </h3>
                        <p className="text-xs text-muted-foreground">{flight.from}</p>
                      </div>

                      <div className="flex flex-col items-center px-2">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {flight.duration || "1h 30m"}
                        </span>
                        <div className="my-1 flex items-center gap-1 text-primary">
                          <span className="h-0.5 w-6 sm:w-10 bg-primary/40"></span>
                          <Plane className="size-3.5 rotate-90" />
                          <span className="h-0.5 w-6 sm:w-10 bg-primary/40"></span>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                          Non-stop
                        </span>
                      </div>

                      <div>
                        <h3 className="font-display text-2xl font-black text-foreground">
                          {flight.toCode}
                        </h3>
                        <p className="text-xs text-muted-foreground">{flight.to}</p>
                      </div>
                    </div>
                  </div>

                  {/* PNR & Statuses */}
                  <div className="flex flex-col items-end gap-1.5 text-right">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">PNR:</span>
                      <span className="font-mono text-sm font-extrabold text-foreground tracking-wider bg-secondary px-2 py-0.5 rounded-md">
                        {ref}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${statusTone}`}>
                        {bStatus}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${paymentTone}`}>
                        {pStatus === "refunded" ? "Refund Processed" : pStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Flight Metrics */}
                <div className="mt-5 grid grid-cols-2 gap-3 border-y border-border/70 py-3.5 sm:grid-cols-4 text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3 text-primary" /> Travel Date
                    </span>
                    <p className="mt-0.5 font-bold text-foreground">{b.travelDate}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {flight.departure} – {flight.arrival}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <DoorOpen className="size-3 text-primary" /> Seat & Gate
                    </span>
                    <p className="mt-0.5 font-bold text-foreground">{b.seat || "Assigned at Gate"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Gate {flight.gate || "A1"} · Terminal {flight.terminal || "T1"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <User className="size-3 text-primary" /> Passengers
                    </span>
                    <p className="mt-0.5 font-bold text-foreground">
                      {b.passengerCount || (b.passengers?.length || 1)} Traveler(s)
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {b.passengers && b.passengers[0]
                        ? `${b.passengers[0].firstName} ${b.passengers[0].lastName}`
                        : "Lead Passenger"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <IndianRupee className="size-3 text-primary" /> Total Fare
                    </span>
                    <p className="mt-0.5 font-bold text-foreground">{currency(total)}</p>
                    <button
                      onClick={() => {
                        setSelectedBooking(b);
                        setFareModalOpen(true);
                      }}
                      className="text-[10px] text-primary hover:underline font-semibold"
                    >
                      View Breakdown &rarr;
                    </button>
                  </div>
                </div>

                {/* Delay Prediction Chip */}
                {d && !isCancelled && (
                  <div
                    className={`mt-3.5 flex items-center gap-2 rounded-xl p-2.5 text-xs ${
                      d.level === "High"
                        ? "bg-destructive/10 text-destructive border border-destructive/20"
                        : d.level === "Medium"
                          ? "bg-warning/15 text-warning-foreground border border-warning/25"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    <Activity className="size-4 shrink-0" />
                    <span>
                      <strong>{d.risk}% {d.level} Delay Risk:</strong> Live flight window {d.window}.
                    </span>
                  </div>
                )}

                {/* Refund Status Alert (if cancelled) */}
                {isCancelled && (
                  b.paymentStatus === "refunded" || b.cancellation?.refundStatus === "processed" ? (
                    <div className="mt-3.5 flex items-center justify-between gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span>
                          Refund of <strong>₹{(b.cancellation?.refundAmount || total - 600).toLocaleString("en-IN")}</strong> approved & credited (Ref: {b.cancellation?.refundTransactionId || "PROCESSED"}).
                        </span>
                      </div>
                      <button
                        onClick={() => handleOpenRefund(b)}
                        className="font-bold underline hover:text-emerald-800"
                      >
                        Track Refund
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3.5 flex items-center justify-between gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 shrink-0 text-amber-600" />
                        <span>
                          Cancellation submitted. Refund credit of <strong>₹{(b.cancellation?.refundAmount || total - 600).toLocaleString("en-IN")}</strong> is awaiting administrator approval.
                        </span>
                      </div>
                      <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        Admin Approval Pending
                      </span>
                    </div>
                  )
                )}

                {/* Footer Action Buttons */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleOpenTimeline(b)}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                    >
                      <Clock className="size-3.5" /> Timeline
                    </button>

                    <button
                      onClick={() => handleDownloadTicket(b)}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                    >
                      <Download className="size-3.5" /> Download Pass
                    </button>

                    {isCancelled ? (
                      <button
                        onClick={() => handleOpenRefund(b)}
                        className="inline-flex items-center gap-1 rounded-xl border border-blue-500/40 bg-blue-500/5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-500/10"
                      >
                        <IndianRupee className="size-3.5" /> Refund Status
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenCancel(b)}
                        className="inline-flex items-center gap-1 rounded-xl border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                      >
                        <Ban className="size-3.5" /> Cancel Flight
                      </button>
                    )}
                  </div>

                  <Link
                    to="/ticket/$bookingId"
                    params={{ bookingId: ref }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-95"
                  >
                    <Ticket className="size-3.5" /> View E-Ticket
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 1. Fare Breakdown Modal */}
      {fareModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="soft-card w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="font-display text-base font-bold text-foreground">
                  Fare Breakdown · PNR {selectedBooking.bookingRef}
                </h4>
                <p className="text-xs text-muted-foreground">Itemized tax & service charge details</p>
              </div>
              <button
                onClick={() => setFareModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Base Airline Fare:</span>
                <span className="font-semibold text-foreground">
                  {currency(selectedBooking.fareBreakdown?.baseFare || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Fuel Surcharge (YQ):</span>
                <span className="font-semibold text-foreground">
                  {currency(selectedBooking.fareBreakdown?.fuelSurcharge || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Airport Passenger Service Fee (PSF):</span>
                <span className="font-semibold text-foreground">
                  {currency(selectedBooking.fareBreakdown?.airportTaxes || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">User Development Fee (UDF):</span>
                <span className="font-semibold text-foreground">
                  {currency(selectedBooking.fareBreakdown?.userDevelopmentFee || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Seat Selection Fee:</span>
                <span className="font-semibold text-foreground">
                  {currency(selectedBooking.fareBreakdown?.seatFee || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Baggage Add-ons:</span>
                <span className="font-semibold text-foreground">
                  {currency(selectedBooking.fareBreakdown?.baggageFee || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">GST & Statutory Levies (9%):</span>
                <span className="font-semibold text-foreground">
                  {currency(selectedBooking.fareBreakdown?.tax || 0)}
                </span>
              </div>

              <div className="border-t border-border pt-3 flex justify-between text-sm font-bold">
                <span className="text-foreground">Total Paid:</span>
                <span className="text-primary">
                  {currency(selectedBooking.fareBreakdown?.total || selectedBooking.totalAmount || 0)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setFareModalOpen(false)}
              className="mt-6 w-full rounded-xl bg-secondary py-2 text-xs font-bold text-foreground hover:bg-secondary/80"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 2. Timeline Modal */}
      {timelineModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="soft-card w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="font-display text-base font-bold text-foreground">
                  Flight Timeline · PNR {selectedBooking.bookingRef}
                </h4>
                <p className="text-xs text-muted-foreground">Live operational journey milestones</p>
              </div>
              <button
                onClick={() => setTimelineModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
              >
                ✕
              </button>
            </div>

            {loadingTimeline ? (
              <div className="py-12 text-center text-xs text-muted-foreground">Loading journey milestones...</div>
            ) : timelineData ? (
              <div className="mt-5 space-y-4">
                <div className="relative border-l-2 border-border ml-3 space-y-6">
                  {timelineData.timeline.map((step) => (
                    <div key={step.step} className="relative pl-6">
                      <div
                        className={`absolute -left-[9px] top-0 size-4 rounded-full border-2 bg-background ${
                          step.status === "completed"
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : step.status === "cancelled"
                              ? "border-destructive bg-destructive"
                              : step.status === "current"
                                ? "border-primary bg-primary animate-pulse"
                                : "border-border"
                        }`}
                      />
                      <h5 className="text-xs font-bold text-foreground">{step.title}</h5>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              onClick={() => setTimelineModalOpen(false)}
              className="mt-6 w-full rounded-xl bg-secondary py-2 text-xs font-bold text-foreground hover:bg-secondary/80"
            >
              Close Timeline
            </button>
          </div>
        </div>
      )}

      {/* 3. Cancellation Request Modal */}
      {cancelModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="soft-card w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-destructive border-b border-border pb-3">
              <AlertTriangle className="size-5 shrink-0" />
              <div>
                <h4 className="font-display text-base font-bold text-foreground">Cancel Booking</h4>
                <p className="text-xs text-muted-foreground">PNR: {cancellingRef}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl bg-secondary/50 p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Fare Paid:</span>
                  <span className="font-semibold text-foreground">
                    {currency(selectedBooking.fareBreakdown?.total || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Airline Cancellation Fee:</span>
                  <span>- ₹600</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  <span>Estimated Refund:</span>
                  <span>{currency(Math.max(0, (selectedBooking.fareBreakdown?.total || 0) - 600))}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Reason for cancellation:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:border-primary"
                >
                  <option value="Change of travel plans">Change of travel plans</option>
                  <option value="Flight schedule conflict">Flight schedule conflict</option>
                  <option value="Medical emergency">Medical emergency</option>
                  <option value="Booked wrong date/time">Booked wrong date/time</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
                <p className="font-bold flex items-center gap-1.5 text-xs">
                  <AlertCircle className="size-3.5 text-amber-600" />
                  Administrator Approval Required
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                  Cancellation requests require administrative review. Your refund credit of {currency(Math.max(0, (selectedBooking.fareBreakdown?.total || 0) - 600))} will only be issued once approved by the administrator.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary"
              >
                Keep Booking
              </button>
              <button
                onClick={submitCancellation}
                disabled={submittingCancel}
                className="rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {submittingCancel ? "Submitting Request..." : "Submit Cancellation Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Refund Status Modal */}
      {refundModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="soft-card w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="font-display text-base font-bold text-foreground">
                  Refund Tracking · PNR {selectedBooking.bookingRef}
                </h4>
                <p className="text-xs text-muted-foreground">Payment reversal record</p>
              </div>
              <button
                onClick={() => setRefundModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
              >
                ✕
              </button>
            </div>

            {loadingRefund ? (
              <div className="py-12 text-center text-xs text-muted-foreground">Fetching refund details...</div>
            ) : refundData ? (
              <div className="mt-4 space-y-3 text-xs">
                {refundData.refundStatus === "processed" || refundData.paymentStatus === "refunded" ? (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-bold">Refund Approved & Credited</p>
                      <p className="text-[11px] opacity-90">Approved by administrator and credited to original payment method.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
                    <Clock className="size-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-bold">Pending Administrator Approval</p>
                      <p className="text-[11px] opacity-90">Your cancellation is under review. Refund credit will only be issued once approved by Admin.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2 rounded-xl border border-border p-3.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Refund Status:</span>
                    <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${
                      refundData.refundStatus === "processed" || refundData.paymentStatus === "refunded"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}>
                      {refundData.refundStatus === "processed" || refundData.paymentStatus === "refunded" ? "Approved & Credited" : "Pending Admin Approval"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Refund Amount:</span>
                    <strong className="text-foreground text-sm font-bold">
                      ₹{Number(refundData.refundAmount || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cancellation Deduction:</span>
                    <span className="text-foreground">₹{refundData.cancellationFee || 600}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction Reference:</span>
                    <span className="font-mono text-foreground font-semibold">
                      {refundData.refundTransactionId && refundData.refundTransactionId !== "N/A"
                        ? refundData.refundTransactionId
                        : "Pending Admin Approval"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing Time:</span>
                    <span className="text-foreground">
                      {refundData.refundStatus === "processed" || refundData.paymentStatus === "refunded"
                        ? "Processed (3-5 business days to reflect)"
                        : "Awaiting approval"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <button
              onClick={() => setRefundModalOpen(false)}
              className="mt-6 w-full rounded-xl bg-secondary py-2 text-xs font-bold text-foreground hover:bg-secondary/80"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
