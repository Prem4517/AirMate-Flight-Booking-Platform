import { useState, useEffect } from "react";
import {
  Plane,
  Plus,
  Search,
  Filter,
  Edit2,
  CalendarClock,
  Radio,
  Ban,
  Trash2,
  Download,
  AlertCircle,
  X,
  CheckCircle,
  Clock,
  ArrowRight,
  ArrowLeftRight,
  Loader2,
} from "lucide-react";
import {
  fetchAdminFlights,
  createFlightAdmin,
  updateFlightAdmin,
  rescheduleFlightAdmin,
  updateFlightStatusAdmin,
  cancelFlightAdmin,
  deleteFlightAdmin,
  downloadAdminCsv,
} from "@/services/api";
import ConfirmationDialog from "./ConfirmationDialog";
import { toast } from "sonner";
import { cities } from "@/data/flights";

const todayIso = new Date().toISOString().slice(0, 10);

const AIRLINE_PREFIX_MAP = {
  "Air India": "AI",
  "IndiGo": "6E",
  "Vistara": "UK",
  "AirMate Connect": "AM",
  "SpiceJet": "SG",
  "Akasa Air": "QP",
};

const PREFIX_AIRLINE_MAP = {
  AI: "Air India",
  "6E": "IndiGo",
  UK: "Vistara",
  AM: "AirMate Connect",
  SG: "SpiceJet",
  QP: "Akasa Air",
};

const blankFlightForm = {
  flightNumber: "",
  airline: "AirMate Connect",
  aircraft: "Airbus A320neo",
  from: "Delhi",
  fromCode: "DEL",
  to: "Mumbai",
  toCode: "BOM",
  date: todayIso,
  departure: "08:00",
  arrival: "10:15",
  durationMins: 135,
  price: 4999,
  seatsTotal: 180,
  seatsBooked: 0,
  fromTerminal: "T1",
  toTerminal: "T2",
  gate: "A3",
  status: "Scheduled",
};

export default function AdminFlightsTab({ onRefreshMetrics }) {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [airlineFilter, setAirlineFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [activeFlight, setActiveFlight] = useState(null);
  const [form, setForm] = useState(blankFlightForm);
  const [rescheduleData, setRescheduleData] = useState({ date: todayIso, departure: "", arrival: "", reason: "" });
  const [statusData, setStatusData] = useState({ status: "On Time", delayMins: 30, reason: "" });

  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    description: "",
    variant: "danger",
    onConfirm: () => {},
  });
  const [actionLoading, setActionLoading] = useState(false);

  const loadFlights = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminFlights({
        query,
        status: statusFilter,
        airline: airlineFilter,
        page,
        limit: 12,
      });
      setFlights(data.flights || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      toast.error(err.message || "Failed to load flights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlights();
  }, [query, statusFilter, airlineFilter, page]);

  // Handle Airline and Flight Number Auto-Alignment
  const handleAirlineChange = (airlineName) => {
    const expectedPrefix = AIRLINE_PREFIX_MAP[airlineName];
    setForm((prev) => {
      let updatedFlightNum = prev.flightNumber;
      if (expectedPrefix) {
        const digits = prev.flightNumber.replace(/^[A-Za-z0-9]{2}-?/, "").trim();
        if (digits) {
          updatedFlightNum = `${expectedPrefix}-${digits}`;
        } else if (!prev.flightNumber) {
          updatedFlightNum = `${expectedPrefix}-`;
        }
      }
      return {
        ...prev,
        airline: airlineName,
        flightNumber: updatedFlightNum,
      };
    });
  };

  const handleFlightNumberChange = (val) => {
    const cleanVal = val.toUpperCase().trimStart();
    const match = cleanVal.match(/^(AI|6E|UK|AM|SG|QP)[- ]?([0-9]*)/);
    setForm((prev) => {
      let updatedAirline = prev.airline;
      if (match) {
        const detectedPrefix = match[1];
        if (PREFIX_AIRLINE_MAP[detectedPrefix] && PREFIX_AIRLINE_MAP[detectedPrefix] !== prev.airline) {
          updatedAirline = PREFIX_AIRLINE_MAP[detectedPrefix];
        }
      }
      return {
        ...prev,
        flightNumber: cleanVal,
        airline: updatedAirline,
      };
    });
  };

  // Handle City Selection for Scheduling
  const handleOriginCityChange = (val) => {
    const trimmed = (val || "").trim();
    const found = cities.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() || c.code.toLowerCase() === trimmed.toLowerCase()
    );
    const newFrom = found ? found.name : val;
    const newFromCode = found ? found.code : val.slice(0, 3).toUpperCase();
    const newFromAirport = found ? found.airport : "";

    setForm((prev) => {
      const isConflict = prev.to && prev.to.toLowerCase() === newFrom.toLowerCase();
      let fallbackTo = prev.to;
      let fallbackToCode = prev.toCode;
      let fallbackToAirport = prev.toAirport;
      if (isConflict) {
        const alt = cities.find((c) => c.name.toLowerCase() !== newFrom.toLowerCase());
        fallbackTo = alt ? alt.name : (newFrom.toLowerCase() === "mumbai" ? "Delhi" : "Mumbai");
        fallbackToCode = alt ? alt.code : (newFrom.toLowerCase() === "mumbai" ? "DEL" : "BOM");
        fallbackToAirport = alt ? alt.airport : "";
      }
      return {
        ...prev,
        from: newFrom,
        fromCode: newFromCode,
        fromAirport: newFromAirport || prev.fromAirport,
        to: fallbackTo,
        toCode: fallbackToCode,
        toAirport: fallbackToAirport,
      };
    });
  };

  const handleDestCityChange = (val) => {
    const trimmed = (val || "").trim();
    const found = cities.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() || c.code.toLowerCase() === trimmed.toLowerCase()
    );
    const newTo = found ? found.name : val;
    const newToCode = found ? found.code : val.slice(0, 3).toUpperCase();
    const newToAirport = found ? found.airport : "";

    setForm((prev) => {
      const isConflict = prev.from && prev.from.toLowerCase() === newTo.toLowerCase();
      let fallbackFrom = prev.from;
      let fallbackFromCode = prev.fromCode;
      let fallbackFromAirport = prev.fromAirport;
      if (isConflict) {
        const alt = cities.find((c) => c.name.toLowerCase() !== newTo.toLowerCase());
        fallbackFrom = alt ? alt.name : (newTo.toLowerCase() === "delhi" ? "Mumbai" : "Delhi");
        fallbackFromCode = alt ? alt.code : (newTo.toLowerCase() === "delhi" ? "BOM" : "DEL");
        fallbackFromAirport = alt ? alt.airport : "";
      }
      return {
        ...prev,
        to: newTo,
        toCode: newToCode,
        toAirport: newToAirport || prev.toAirport,
        from: fallbackFrom,
        fromCode: fallbackFromCode,
        fromAirport: fallbackFromAirport,
      };
    });
  };

  const handleSwapCities = () => {
    setForm((prev) => ({
      ...prev,
      from: prev.to,
      fromCode: prev.toCode,
      fromAirport: prev.toAirport,
      to: prev.from,
      toCode: prev.fromCode,
      toAirport: prev.fromAirport,
    }));
  };

  // Check for airline / flight number mismatch
  const getAirlineMismatch = () => {
    if (!form.flightNumber) return null;
    const match = form.flightNumber.match(/^(AI|6E|UK|AM|SG|QP)[- ]?/);
    if (!match) return null;
    const detectedPrefix = match[1];
    const detectedAirline = PREFIX_AIRLINE_MAP[detectedPrefix];
    const expectedPrefix = AIRLINE_PREFIX_MAP[form.airline];
    if (detectedAirline && detectedAirline !== form.airline) {
      return { detectedAirline, expectedPrefix, detectedPrefix };
    }
    return null;
  };

  const isSameCity = Boolean(
    form.from &&
    form.to &&
    form.from.trim().toLowerCase() === form.to.trim().toLowerCase()
  );

  // Handle Create Flight
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.flightNumber || !form.airline || !form.from || !form.to) {
      toast.error("Please fill in all mandatory flight fields.");
      return;
    }
    if (form.from.trim().toLowerCase() === form.to.trim().toLowerCase()) {
      toast.error("Origin and Destination cannot be the same city. Please select different cities.");
      return;
    }

    setActionLoading(true);
    try {
      await createFlightAdmin({
        ...form,
        fromCode: form.fromCode || form.from.slice(0, 3).toUpperCase(),
        toCode: form.toCode || form.to.slice(0, 3).toUpperCase(),
        price: Number(form.price),
        seatsTotal: Number(form.seatsTotal),
        durationMins: Number(form.durationMins),
      });
      toast.success(`Flight ${form.flightNumber} scheduled successfully`);
      setIsCreateModalOpen(false);
      setForm(blankFlightForm);
      loadFlights();
      onRefreshMetrics?.();
    } catch (err) {
      toast.error(err.message || "Failed to schedule flight");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Flight
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeFlight) return;

    setActionLoading(true);
    try {
      await updateFlightAdmin(activeFlight.id, {
        price: Number(form.price),
        aircraft: form.aircraft,
        seatsTotal: Number(form.seatsTotal),
        fromTerminal: form.fromTerminal,
        toTerminal: form.toTerminal,
        gate: form.gate,
      });
      toast.success(`Flight ${activeFlight.flightNumber} updated successfully`);
      setIsEditModalOpen(false);
      loadFlights();
      onRefreshMetrics?.();
    } catch (err) {
      toast.error(err.message || "Failed to update flight");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reschedule
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!activeFlight) return;

    setActionLoading(true);
    try {
      await rescheduleFlightAdmin(activeFlight.id, rescheduleData);
      toast.success(`Flight ${activeFlight.flightNumber} rescheduled successfully`);
      setIsRescheduleModalOpen(false);
      loadFlights();
      onRefreshMetrics?.();
    } catch (err) {
      toast.error(err.message || "Failed to reschedule flight");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Status Update
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!activeFlight) return;

    setActionLoading(true);
    try {
      await updateFlightStatusAdmin(activeFlight.id, statusData);
      toast.success(`Status updated for ${activeFlight.flightNumber}`);
      setIsStatusModalOpen(false);
      loadFlights();
      onRefreshMetrics?.();
    } catch (err) {
      toast.error(err.message || "Failed to update flight status");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancel Flight with confirmation
  const promptCancelFlight = (flight) => {
    setConfirmDialog({
      isOpen: true,
      title: `Cancel Flight ${flight.flightNumber}?`,
      description: `Cancelling this flight preserves all existing booking records and marks the flight as Cancelled in the schedule. Passengers will be notified of operational cancellation.`,
      variant: "warning",
      confirmText: "Cancel Flight",
      onConfirm: async () => {
        try {
          await cancelFlightAdmin(flight.id, { reason: "Flight operations cancellation" });
          toast.success(`Flight ${flight.flightNumber} marked as Cancelled`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          loadFlights();
          onRefreshMetrics?.();
        } catch (err) {
          toast.error(err.message || "Failed to cancel flight");
        }
      },
    });
  };

  // Handle Safe Delete with confirmation and booking check
  const promptDeleteFlight = (flight) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Flight ${flight.flightNumber}?`,
      description: `This will permanently remove the flight from the catalog. Note: If passenger bookings exist for this flight, deletion will be blocked to preserve booking records.`,
      variant: "danger",
      confirmText: "Permanently Delete",
      onConfirm: async () => {
        try {
          await deleteFlightAdmin(flight.id);
          toast.success(`Flight ${flight.flightNumber} deleted successfully`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          loadFlights();
          onRefreshMetrics?.();
        } catch (err) {
          toast.error(err.message || "Failed to delete flight");
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      await downloadAdminCsv("flights");
      toast.success("Flights CSV downloaded successfully");
    } catch (err) {
      toast.error(err.message || "Failed to export flights");
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Flight Operations Management</h2>
          <p className="text-xs text-muted-foreground">
            Manage routes, aircraft, schedules, capacities and status across Indian airspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
          >
            <Download className="size-3.5" /> Export CSV
          </button>

          <button
            onClick={() => {
              setForm(blankFlightForm);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <Plus className="size-4" /> Schedule Flight
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
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
            placeholder="Search by flight number, airline, origin, destination..."
            className="w-full rounded-xl border border-border/80 bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="On Time">On Time</option>
            <option value="Delayed">Delayed</option>
            <option value="Departed">Departed</option>
            <option value="Arrived">Arrived</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Airline:</span>
          <select
            value={airlineFilter}
            onChange={(e) => {
              setAirlineFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="all">All Airlines</option>
            <option value="Air India">Air India</option>
            <option value="IndiGo">IndiGo</option>
            <option value="Vistara">Vistara</option>
            <option value="AirMate Connect">AirMate Connect</option>
            <option value="SpiceJet">SpiceJet</option>
            <option value="Akasa Air">Akasa Air</option>
          </select>
        </div>
      </div>

      {/* Flights Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/50 font-bold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Flight / Airline</th>
                <th className="px-4 py-3">Aircraft</th>
                <th className="px-4 py-3">Route & Terminal</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Seat Occupancy</th>
                <th className="px-4 py-3">Base Fare</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                    <span className="mt-2 block">Loading flights schedule...</span>
                  </td>
                </tr>
              ) : flights.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-muted-foreground">
                    No flights found matching the current criteria.
                  </td>
                </tr>
              ) : (
                flights.map((f) => {
                  const seatsTotal = f.seatsTotal || 180;
                  const seatsBooked = f.seatsBooked || 0;
                  const occupancy = Math.round((seatsBooked / seatsTotal) * 100);

                  const statusClass =
                    f.status === "On Time"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : f.status === "Delayed"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : f.status === "Cancelled"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";

                  return (
                    <tr key={f.id} className="transition-colors hover:bg-secondary/30">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground">{f.flightNumber}</div>
                        <div className="text-[11px] text-muted-foreground">{f.airline}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-foreground">{f.aircraft || "A320"}</div>
                        <div className="text-[10px] text-muted-foreground">Gate: {f.gate || "A1"}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 font-semibold text-foreground">
                          <span>{f.fromCode || f.from}</span>
                          <ArrowRight className="size-3 text-muted-foreground" />
                          <span>{f.toCode || f.to}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {f.from} ➔ {f.to} ({f.fromTerminal || "T1"})
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-foreground">
                          {f.departure} – {f.arrival}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {f.date ? <span className="font-semibold text-primary">{f.date} · </span> : null}
                          Duration: {f.duration || `${f.durationMins || 120}m`}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span>
                            {seatsBooked} / {seatsTotal}
                          </span>
                          <span className="font-bold">{occupancy}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full ${
                              occupancy > 85 ? "bg-rose-500" : occupancy > 60 ? "bg-amber-500" : "bg-primary"
                            }`}
                            style={{ width: `${occupancy}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-bold text-foreground">
                        ₹{(f.price || 0).toLocaleString("en-IN")}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusClass}`}
                        >
                          {f.status || "Scheduled"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit Details */}
                          <button
                            title="Edit details and pricing"
                            onClick={() => {
                              setActiveFlight(f);
                              setForm({
                                ...blankFlightForm,
                                ...f,
                                price: f.price || 4000,
                                seatsTotal: f.seatsTotal || 180,
                              });
                              setIsEditModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Edit2 className="size-3.5" />
                          </button>

                          {/* Reschedule */}
                          <button
                            title="Reschedule departure & arrival"
                            onClick={() => {
                              setActiveFlight(f);
                              setRescheduleData({
                                date: f.date || todayIso,
                                departure: f.departure,
                                arrival: f.arrival,
                                reason: "",
                              });
                              setIsRescheduleModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-blue-500"
                          >
                            <CalendarClock className="size-3.5" />
                          </button>

                          {/* Update Status */}
                          <button
                            title="Update status (Delay, Depart, Arrive)"
                            onClick={() => {
                              setActiveFlight(f);
                              setStatusData({
                                status: f.status || "On Time",
                                delayMins: f.delayMins || 30,
                                reason: "",
                              });
                              setIsStatusModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-amber-500"
                          >
                            <Radio className="size-3.5" />
                          </button>

                          {/* Cancel */}
                          {f.status !== "Cancelled" && (
                            <button
                              title="Cancel flight operations"
                              onClick={() => promptCancelFlight(f)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-rose-500"
                            >
                              <Ban className="size-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            title="Safe delete"
                            onClick={() => promptDeleteFlight(f)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
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
            Showing {flights.length} of {totalCount} flights
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

      {/* Create Flight Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Schedule New Commercial Flight</h3>
              <button onClick={() => setIsCreateModalOpen(false)}>
                <X className="size-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Flight Number *</label>
                  <input
                    type="text"
                    required
                    value={form.flightNumber}
                    onChange={(e) => handleFlightNumberChange(e.target.value)}
                    placeholder="e.g. AI-805, UK-480, 6E-204"
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Airline *</label>
                  <select
                    value={form.airline}
                    onChange={(e) => handleAirlineChange(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden"
                  >
                    <option value="Air India">Air India (AI)</option>
                    <option value="IndiGo">IndiGo (6E)</option>
                    <option value="Vistara">Vistara (UK)</option>
                    <option value="AirMate Connect">AirMate Connect (AM)</option>
                    <option value="SpiceJet">SpiceJet (SG)</option>
                    <option value="Akasa Air">Akasa Air (QP)</option>
                  </select>
                </div>

                {/* Airline & Flight Number Mismatch Helper Alert */}
                {(() => {
                  const mismatch = getAirlineMismatch();
                  if (!mismatch) return null;
                  return (
                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>
                          Prefix <strong>{mismatch.detectedPrefix}</strong> belongs to <strong>{mismatch.detectedAirline}</strong>, but airline is set to <strong>{form.airline}</strong>.
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, airline: mismatch.detectedAirline }))}
                          className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-900 dark:text-amber-100 hover:bg-amber-500/30 transition-colors"
                        >
                          Switch to {mismatch.detectedAirline}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const digits = form.flightNumber.replace(/^[A-Za-z0-9]{2}-?/, "").trim() || "480";
                            setForm((prev) => ({ ...prev, flightNumber: `${mismatch.expectedPrefix}-${digits}` }));
                          }}
                          className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-900 dark:text-amber-100 hover:bg-amber-500/30 transition-colors"
                        >
                          Use {mismatch.expectedPrefix}-
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Origin City */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Origin City *</label>
                    {form.fromCode && (
                      <span className="font-mono text-[11px] font-bold text-primary">[{form.fromCode}]</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    list="admin-cities-origin-list"
                    value={form.from}
                    onChange={(e) => handleOriginCityChange(e.target.value)}
                    placeholder="Search or pick origin city..."
                    className={`mt-1 w-full rounded-xl border bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden ${
                      isSameCity ? "border-destructive ring-1 ring-destructive/30" : "border-border"
                    }`}
                  />
                  <datalist id="admin-cities-origin-list">
                    {cities
                      .filter((c) => c.name.toLowerCase() !== (form.to || "").trim().toLowerCase())
                      .map((c) => (
                        <option key={`orig-${c.code}`} value={c.name}>
                          {c.code} — {c.airport}
                        </option>
                      ))}
                  </datalist>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Goa", "Chennai", "Kolkata", "Varanasi"]
                      .filter((cName) => cName.toLowerCase() !== (form.to || "").trim().toLowerCase())
                      .map((cName) => (
                        <button
                          key={cName}
                          type="button"
                          onClick={() => handleOriginCityChange(cName)}
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                            form.from === cName
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {cName}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Destination City */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-muted-foreground">Destination City *</label>
                      <button
                        type="button"
                        onClick={handleSwapCities}
                        title="Swap Origin and Destination"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                      >
                        <ArrowLeftRight className="size-3" /> Swap
                      </button>
                    </div>
                    {form.toCode && (
                      <span className="font-mono text-[11px] font-bold text-primary">[{form.toCode}]</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    list="admin-cities-dest-list"
                    value={form.to}
                    onChange={(e) => handleDestCityChange(e.target.value)}
                    placeholder="Search or pick destination city..."
                    className={`mt-1 w-full rounded-xl border bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden ${
                      isSameCity ? "border-destructive ring-1 ring-destructive/30" : "border-border"
                    }`}
                  />
                  <datalist id="admin-cities-dest-list">
                    {cities
                      .filter((c) => c.name.toLowerCase() !== (form.from || "").trim().toLowerCase())
                      .map((c) => (
                        <option key={`dest-${c.code}`} value={c.name}>
                          {c.code} — {c.airport}
                        </option>
                      ))}
                  </datalist>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {["Mumbai", "Delhi", "Goa", "Jaipur", "Kochi", "Bangalore", "Pune", "Srinagar"]
                      .filter((cName) => cName.toLowerCase() !== (form.from || "").trim().toLowerCase())
                      .map((cName) => (
                        <button
                          key={cName}
                          type="button"
                          onClick={() => handleDestCityChange(cName)}
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                            form.to === cName
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {cName}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Same City Warning Alert */}
                {isSameCity && (
                  <div className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    Origin and Destination cannot be the same city ({form.from}). Please select a different destination.
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Flight Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    min={todayIso}
                    value={form.date || todayIso}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Departure Time *</label>
                  <input
                    type="time"
                    required
                    value={form.departure}
                    onChange={(e) => setForm({ ...form, departure: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Arrival Time *</label>
                  <input
                    type="time"
                    required
                    value={form.arrival}
                    onChange={(e) => setForm({ ...form, arrival: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Aircraft Model</label>
                  <input
                    type="text"
                    value={form.aircraft}
                    onChange={(e) => setForm({ ...form, aircraft: e.target.value })}
                    placeholder="e.g. Airbus A320neo, Boeing 737"
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Base Economy Fare (₹) *</label>
                  <input
                    type="number"
                    min="500"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Total Seat Capacity</label>
                  <input
                    type="number"
                    min="10"
                    value={form.seatsTotal}
                    onChange={(e) => setForm({ ...form, seatsTotal: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Terminal & Gate</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Terminal (T1)"
                      value={form.fromTerminal}
                      onChange={(e) => setForm({ ...form, fromTerminal: e.target.value })}
                      className="mt-1 w-1/2 rounded-xl border border-border bg-background p-2.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Gate (A1)"
                      value={form.gate}
                      onChange={(e) => setForm({ ...form, gate: e.target.value })}
                      className="mt-1 w-1/2 rounded-xl border border-border bg-background p-2.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || isSameCity}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Scheduling..." : "Create & Schedule Flight"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Flight Modal */}
      {isEditModalOpen && activeFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Edit Flight {activeFlight.flightNumber}</h3>
                <p className="text-xs text-muted-foreground">
                  Update pricing, aircraft specification, and capacity.
                </p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)}>
                <X className="size-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Base Economy Fare (₹)</label>
                <input
                  type="number"
                  required
                  min="500"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs"
                />
                <span className="text-[10px] text-muted-foreground">
                  Fare breakdowns and cabin class tiers will be recalculated automatically.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Aircraft Model</label>
                <input
                  type="text"
                  value={form.aircraft}
                  onChange={(e) => setForm({ ...form, aircraft: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Total Seat Capacity</label>
                <input
                  type="number"
                  min={activeFlight.seatsBooked || 0}
                  value={form.seatsTotal}
                  onChange={(e) => setForm({ ...form, seatsTotal: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs"
                />
                <span className="text-[10px] text-muted-foreground">
                  Currently {activeFlight.seatsBooked || 0} seats booked. Cannot be reduced below booked count.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Terminal</label>
                  <input
                    type="text"
                    value={form.fromTerminal}
                    onChange={(e) => setForm({ ...form, fromTerminal: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Gate</label>
                  <input
                    type="text"
                    value={form.gate}
                    onChange={(e) => setForm({ ...form, gate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Flight Modal */}
      {isRescheduleModalOpen && activeFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Reschedule {activeFlight.flightNumber}</h3>
                <p className="text-xs text-muted-foreground">Update operational departure & arrival schedule</p>
              </div>
              <button onClick={() => setIsRescheduleModalOpen(false)}>
                <X className="size-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">New Departure Date</label>
                <input
                  type="date"
                  min={todayIso}
                  value={rescheduleData.date || todayIso}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">New Departure</label>
                  <input
                    type="time"
                    required
                    value={rescheduleData.departure}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, departure: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">New Arrival</label>
                  <input
                    type="time"
                    required
                    value={rescheduleData.arrival}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, arrival: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Operational Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Weather conditions, ATC Slot Delay"
                  value={rescheduleData.reason}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? "Applying..." : "Confirm Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flight Status Modal */}
      {isStatusModalOpen && activeFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Flight Status Update</h3>
                <p className="text-xs text-muted-foreground">
                  Update operational status for {activeFlight.flightNumber}
                </p>
              </div>
              <button onClick={() => setIsStatusModalOpen(false)}>
                <X className="size-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Current Operational Status</label>
                <select
                  value={statusData.status}
                  onChange={(e) => setStatusData({ ...statusData, status: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs"
                >
                  <option value="On Time">On Time</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Departed">Departed</option>
                  <option value="Arrived">Arrived</option>
                  <option value="Scheduled">Scheduled</option>
                </select>
              </div>

              {statusData.status === "Delayed" && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Delay Duration (Minutes)</label>
                  <input
                    type="number"
                    min="5"
                    value={statusData.delayMins}
                    onChange={(e) => setStatusData({ ...statusData, delayMins: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Status Reason / Announcement</label>
                <input
                  type="text"
                  placeholder="e.g. Delayed due to late arrival of incoming aircraft"
                  value={statusData.reason}
                  onChange={(e) => setStatusData({ ...statusData, reason: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {actionLoading ? "Updating..." : "Update Status"}
                </button>
              </div>
            </form>
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
