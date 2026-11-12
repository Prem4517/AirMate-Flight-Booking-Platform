import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  Download,
  Filter,
  Clock,
  User,
  Database,
  ArrowRight,
  Loader2,
  FileText,
} from "lucide-react";
import { fetchAdminAuditLogs, downloadAdminCsv } from "@/services/api";
import { toast } from "sonner";

export default function AdminAuditLogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminAuditLogs({
        query,
        action: actionFilter,
        targetType: targetTypeFilter,
        page,
        limit: 20,
      });
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      toast.error(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [query, actionFilter, targetTypeFilter, page]);

  // Export CSV
  const handleExportCsv = async () => {
    try {
      await downloadAdminCsv("audit-logs");
      toast.success("Audit logs CSV downloaded successfully");
    } catch (err) {
      toast.error(err.message || "Failed to export audit logs");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Operational Security & Action Audit Trail</h2>
          <p className="text-xs text-muted-foreground">
            Immutable log of all administrative creations, schedule reschedulings, status updates, cancellations, and refunds.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
        >
          <Download className="size-3.5" /> Export Audit Trail CSV
        </button>
      </div>

      {/* Filter and Search Bar */}
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
            placeholder="Search audit trail by admin email, action, target..."
            className="w-full rounded-xl border border-border/80 bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="all">All Actions</option>
            <option value="FLIGHT_CREATE">FLIGHT_CREATE</option>
            <option value="FLIGHT_UPDATE">FLIGHT_UPDATE</option>
            <option value="FLIGHT_RESCHEDULE">FLIGHT_RESCHEDULE</option>
            <option value="FLIGHT_STATUS_UPDATE">FLIGHT_STATUS_UPDATE</option>
            <option value="FLIGHT_CANCEL">FLIGHT_CANCEL</option>
            <option value="FLIGHT_DELETE">FLIGHT_DELETE</option>
            <option value="BOOKING_STATUS_UPDATE">BOOKING_STATUS_UPDATE</option>
            <option value="BOOKING_REFUND">BOOKING_REFUND</option>
            <option value="USER_STATUS_UPDATE">USER_STATUS_UPDATE</option>
            <option value="USER_ROLE_UPDATE">USER_ROLE_UPDATE</option>
            <option value="DATA_EXPORT">DATA_EXPORT</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Target Type:</span>
          <select
            value={targetTypeFilter}
            onChange={(e) => {
              setTargetTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="all">All Targets</option>
            <option value="Flight">Flight</option>
            <option value="Booking">Booking</option>
            <option value="User">User</option>
            <option value="Export">Export</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/50 font-bold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Administrator</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target Resource</th>
                <th className="px-4 py-3">Details / Parameters</th>
                <th className="px-4 py-3 text-right">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                    <span className="mt-2 block">Loading audit logs...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-muted-foreground">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => {
                  const actionColor = log.action.includes("CANCEL") || log.action.includes("DELETE")
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    : log.action.includes("REFUND")
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                    : log.action.includes("CREATE")
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : log.action.includes("RESCHEDULE")
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    : "bg-secondary text-foreground border-border";

                  return (
                    <tr key={log.id || log._id || idx} className="transition-colors hover:bg-secondary/30">
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">{log.adminName || "Administrator"}</div>
                        <div className="text-[11px] text-muted-foreground">{log.adminEmail}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${actionColor}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{log.targetType}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{log.targetId}</div>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-foreground">
                        <span className="line-clamp-1 max-w-xs">
                          {typeof log.details === "object"
                            ? JSON.stringify(log.details)
                            : String(log.details || "—")}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-[11px] text-muted-foreground">
                        {log.ipAddress || "127.0.0.1"}
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
            Showing {logs.length} of {totalCount} audit events
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
    </div>
  );
}
