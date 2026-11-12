import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  Calendar,
  Ticket,
  Download,
  Plane,
  RotateCcw,
  IndianRupee,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  Receipt,
  HelpCircle,
} from "lucide-react";
import { currency } from "@/data/flights";
import { fetchBookingRefundStatus } from "@/services/api";
import { toast } from "sonner";

export default function BookingHistoryTab({ bookings = [] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRefundBooking, setSelectedRefundBooking] = useState(null);
  const [refundData, setRefundData] = useState(null);
  const [loadingRefund, setLoadingRefund] = useState(false);

  // Helper to extract cancellation & refund data reliably
  const getRefundInfo = (b) => {
    const isCancelled = b.bookingStatus === "cancelled";
    const isRefunded = b.paymentStatus === "refunded" || isCancelled;
    const total = b.fareBreakdown?.total || b.totalAmount || 0;
    const fee = b.cancellation?.cancellationFee || 0;

    let refundAmount = 0;
    if (b.cancellation?.refundAmount !== undefined && b.cancellation?.refundAmount !== null && b.cancellation?.refundAmount > 0) {
      refundAmount = b.cancellation.refundAmount;
    } else if (isCancelled || isRefunded) {
      refundAmount = Math.max(0, total - fee);
    }

    const rawStatus = b.cancellation?.refundStatus;
    let statusText = "None";
    if (rawStatus === "processed" || rawStatus === "completed" || b.paymentStatus === "refunded") {
      statusText = fee > 0 && refundAmount < total ? "Partially Refunded" : "Fully Refunded";
    } else if (rawStatus === "pending") {
      statusText = "Refund In Progress";
    } else if (rawStatus === "rejected") {
      statusText = "Refund Rejected";
    } else if (isCancelled) {
      statusText = fee > 0 && refundAmount < total ? "Partially Refunded" : "Fully Refunded";
    }

    return {
      isCancelled,
      isRefunded,
      total,
      fee,
      refundAmount,
      statusText,
      transactionId: b.cancellation?.refundTransactionId || b.transactionId || "",
    };
  };

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const q = search.toLowerCase();
      const pnrMatch = (b.bookingRef || "").toLowerCase().includes(q);
      const flight = b.flight || {};
      const flightMatch =
        (flight.flightNumber || "").toLowerCase().includes(q) ||
        (flight.airline || "").toLowerCase().includes(q) ||
        (flight.from || "").toLowerCase().includes(q) ||
        (flight.to || "").toLowerCase().includes(q) ||
        (flight.fromCode || "").toLowerCase().includes(q) ||
        (flight.toCode || "").toLowerCase().includes(q);

      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "confirmed" && b.bookingStatus === "confirmed") ||
        (statusFilter === "cancelled" && b.bookingStatus === "cancelled") ||
        (statusFilter === "pending" && b.bookingStatus === "pending");

      return (pnrMatch || flightMatch) && statusMatch;
    });
  }, [bookings, search, statusFilter]);

  // Aggregate stats
  const totalPaid = bookings
    .filter((b) => b.paymentStatus === "paid" && b.bookingStatus !== "cancelled")
    .reduce((acc, b) => acc + (b.fareBreakdown?.total || b.totalAmount || 0), 0);

  const totalRefunded = bookings
    .filter((b) => b.bookingStatus === "cancelled" || b.paymentStatus === "refunded")
    .reduce((acc, b) => {
      const info = getRefundInfo(b);
      return acc + info.refundAmount;
    }, 0);

  const confirmedCount = bookings.filter((b) => b.bookingStatus === "confirmed").length;
  const cancelledCount = bookings.filter((b) => b.bookingStatus === "cancelled").length;

  const handleDownload = (ref) => {
    toast.info(`Downloading digital ticket for PNR ${ref}...`);
    window.open(`/ticket/${ref}`, "_blank");
  };

  const handleOpenRefundModal = async (b) => {
    setSelectedRefundBooking(b);
    setRefundData(null);
    setLoadingRefund(true);
    try {
      const ref = b.bookingRef || b.bookingId;
      const data = await fetchBookingRefundStatus(ref);
      setRefundData(data);
    } catch {
      const info = getRefundInfo(b);
      setRefundData({
        bookingRef: b.bookingRef || b.bookingId,
        refundAmount: info.refundAmount,
        cancellationFee: info.fee,
        refundStatus: info.statusText,
        refundTransactionId: info.transactionId || "REF-SRC-" + (b.bookingRef || "PROCESSED"),
        estimatedDays: "3-5 business days",
      });
    } finally {
      setLoadingRefund(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="soft-card p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Total Journeys
          </span>
          <p className="mt-1 font-display text-2xl font-black text-foreground">{bookings.length}</p>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            {confirmedCount} confirmed · {cancelledCount} cancelled
          </span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Confirmed Bookings
          </span>
          <p className="mt-1 font-display text-2xl font-black text-foreground">{confirmedCount}</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
            Active travel itineraries
          </span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">
            Cancellations & Refunds
          </span>
          <p className="mt-1 font-display text-2xl font-black text-foreground">{cancelledCount}</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
            {totalRefunded > 0 ? `${currency(totalRefunded)} refunded` : "0 refunds processed"}
          </span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Total Spend (Net)
          </span>
          <p className="mt-1 font-display text-2xl font-black text-primary">
            {currency(totalPaid)}
          </p>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            {totalRefunded > 0 ? `Excludes ${currency(totalRefunded)} refunded` : "All paid bookings"}
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by PNR, city, airport, flight number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2 text-xs outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {["all", "confirmed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "border border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      {filtered.length === 0 ? (
        <div className="soft-card p-12 text-center">
          <RotateCcw className="mx-auto size-10 text-muted-foreground/40" />
          <h4 className="mt-3 font-display text-base font-bold text-foreground">
            No booking records match your query
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search terms or filters.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[780px] text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Flight</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Travel Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Refund Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((b) => {
                const flight = b.flight || {};
                const ref = b.bookingRef || b.bookingId;
                const info = getRefundInfo(b);
                const isCancelled = info.isCancelled;

                return (
                  <tr key={ref || b._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {ref}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">
                        {flight.airline || "AirMate"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{flight.flightNumber}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">
                        {flight.fromCode} → {flight.toCode}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {flight.from} to {flight.to}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{b.travelDate}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {flight.departure} – {flight.arrival}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                          isCancelled
                            ? "bg-destructive/15 text-destructive"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {isCancelled ? <XCircle className="size-3" /> : <CheckCircle2 className="size-3" />}
                        {b.bookingStatus || "Confirmed"}
                      </span>
                    </td>

                    {/* Amount Column: distinguishes between original fare paid and refund notice */}
                    <td className="py-3 px-4">
                      {isCancelled ? (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-muted-foreground line-through">
                              {currency(info.total)}
                            </span>
                            <span className="rounded bg-secondary px-1 py-0.2 text-[9px] font-bold text-muted-foreground uppercase">
                              Original
                            </span>
                          </div>
                          <span
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold cursor-help mt-0.5 inline-flex items-center gap-0.5"
                            title={`Original fare of ${currency(info.total)} was fully refunded to your original payment account.`}
                          >
                            Refunded to source
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-foreground">
                            {currency(info.total)}
                          </div>
                          <div className="text-[10px] text-muted-foreground capitalize">
                            {b.paymentStatus === "paid" ? "Paid in full" : b.paymentStatus || "Pending"}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Refund Status Column */}
                    <td className="py-3 px-4">
                      {isCancelled ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            +{currency(info.refundAmount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenRefundModal(b)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                            title="Click to view refund receipt & tracking details"
                          >
                            <span className="size-1.5 rounded-full bg-emerald-500"></span>
                            {info.statusText}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 font-medium text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {isCancelled ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRefundModal(b)}
                            title="View Refund Receipt"
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                          >
                            <Receipt className="size-3 text-emerald-600 dark:text-emerald-400" />
                            Refund
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDownload(ref)}
                            title="Download Boarding Pass"
                            className="rounded-lg p-1.5 border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Download className="size-3.5" />
                          </button>
                        )}
                        <Link
                          to="/ticket/$bookingId"
                          params={{ bookingId: ref }}
                          className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-95"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Refund Details Modal */}
      {selectedRefundBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="soft-card w-full max-w-md p-6 animate-in fade-in zoom-in-95 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="font-display text-base font-bold text-foreground">
                  Refund Receipt · PNR {selectedRefundBooking.bookingRef || selectedRefundBooking.bookingId}
                </h4>
                <p className="text-xs text-muted-foreground">Original source payment reversal record</p>
              </div>
              <button
                onClick={() => setSelectedRefundBooking(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingRefund ? (
              <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span>Fetching refund status...</span>
              </div>
            ) : refundData ? (
              <div className="mt-4 space-y-3.5 text-xs">
                <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-bold">
                      {refundData.refundStatus === "pending" ? "Refund In Progress" : "Refund Processed to Source"}
                    </p>
                    <p className="text-[11px] opacity-90">
                      Credited back to the original source payment account.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 rounded-xl border border-border p-3.5 bg-secondary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Original Fare Paid:</span>
                    <span className="line-through text-muted-foreground font-semibold">
                      {currency(
                        selectedRefundBooking.fareBreakdown?.total ||
                          selectedRefundBooking.totalAmount ||
                          refundData.refundAmount + (refundData.cancellationFee || 0)
                      )}
                    </span>
                  </div>

                  {refundData.cancellationFee > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Cancellation Deduction:</span>
                      <span className="text-destructive font-semibold">
                        -{currency(refundData.cancellationFee)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-border/60 pt-2">
                    <span className="font-bold text-foreground">Net Refunded Amount:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 text-base font-black">
                      +{currency(refundData.refundAmount)}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center pt-1 text-[11px]">
                    <span className="text-muted-foreground">Refund Reference:</span>
                    <span className="font-mono text-foreground font-semibold select-all">
                      {refundData.refundTransactionId || "REF-" + (selectedRefundBooking.bookingRef || "SOURCE")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">Estimated Settlement:</span>
                    <span className="text-foreground font-medium">
                      {refundData.estimatedDays || "3-5 business days"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <button
              onClick={() => setSelectedRefundBooking(null)}
              className="mt-5 w-full rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
