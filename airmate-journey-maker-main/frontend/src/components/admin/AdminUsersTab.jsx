import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Download,
  Filter,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Lock,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  fetchAdminUsers,
  updateUserStatusAdmin,
  updateUserRoleAdmin,
  downloadAdminCsv,
} from "@/services/api";
import { useStore } from "@/lib/store";
import ConfirmationDialog from "./ConfirmationDialog";
import { toast } from "sonner";

export default function AdminUsersTab({ onRefreshMetrics }) {
  const { user: currentAdmin } = useStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    description: "",
    variant: "warning",
    onConfirm: () => {},
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminUsers({
        query,
        role: roleFilter,
        accountStatus: statusFilter,
        page,
        limit: 15,
      });
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      toast.error(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [query, roleFilter, statusFilter, page]);

  // Prompt suspend / activate
  const promptToggleStatus = (targetUser) => {
    const isSuspending = targetUser.accountStatus === "active";
    const newStatus = isSuspending ? "suspended" : "active";

    if (targetUser.id === currentAdmin?.id && isSuspending) {
      toast.error("Security safeguard: You cannot suspend your own administrative account.");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: isSuspending ? `Suspend Account for ${targetUser.name}?` : `Reactivate Account for ${targetUser.name}?`,
      description: isSuspending
        ? `Suspending this user will immediately invalidate active sessions and block further reservations and sign-ins.`
        : `Reactivating this account will restore standard portal access.`,
      variant: isSuspending ? "danger" : "info",
      confirmText: isSuspending ? "Suspend Account" : "Reactivate Account",
      onConfirm: async () => {
        try {
          await updateUserStatusAdmin(targetUser.id, newStatus);
          toast.success(`Account status updated to ${newStatus}`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          loadUsers();
          onRefreshMetrics?.();
        } catch (err) {
          toast.error(err.message || "Failed to update account status");
        }
      },
    });
  };

  // Prompt promote / demote
  const promptToggleRole = (targetUser) => {
    const isPromoting = targetUser.role === "customer";
    const newRole = isPromoting ? "admin" : "customer";

    if (targetUser.id === currentAdmin?.id && !isPromoting) {
      toast.error("Security safeguard: Administrators cannot demote themselves from the admin role.");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: isPromoting ? `Grant Administrator Rights to ${targetUser.name}?` : `Revoke Administrator Rights for ${targetUser.name}?`,
      description: isPromoting
        ? `Granting admin rights provides full operational access to the operations cockpit, schedules, flight controls, and refunds.`
        : `Demoting this user converts them back to a customer passenger account.`,
      variant: isPromoting ? "warning" : "danger",
      confirmText: isPromoting ? "Promote to Admin" : "Demote to Customer",
      onConfirm: async () => {
        try {
          await updateUserRoleAdmin(targetUser.id, newRole);
          toast.success(`User role changed to ${newRole}`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          loadUsers();
          onRefreshMetrics?.();
        } catch (err) {
          toast.error(err.message || "Failed to update user role");
        }
      },
    });
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      await downloadAdminCsv("users");
      toast.success("Users CSV downloaded successfully");
    } catch (err) {
      toast.error(err.message || "Failed to export users");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">User Directory & Access Governance</h2>
          <p className="text-xs text-muted-foreground">
            Manage passenger and administrator accounts, assign operational roles, and enforce security controls.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
        >
          <Download className="size-3.5" /> Export Users CSV
        </button>
      </div>

      {/* Security Redaction Guarantee Notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-border/80 bg-secondary/30 p-4 text-xs">
        <Lock className="mt-0.5 size-4 shrink-0 text-emerald-500" />
        <div>
          <span className="font-bold text-foreground">Zero-Exposure Credential Policy:</span>
          <p className="mt-0.5 text-muted-foreground">
            In compliance with strict data protection and cybersecurity standards, password hashes,
            session tokens, and sensitive payment card credentials are never selected or serialized over
            API endpoints.
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
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
            placeholder="Search by name, email..."
            className="w-full rounded-xl border border-border/80 bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="all">All Roles</option>
            <option value="customer">Customer</option>
            <option value="admin">Administrator</option>
          </select>
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
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/50 font-bold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">User / Identity</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3">Registered Date</th>
                <th className="px-4 py-3 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                    <span className="mt-2 block">Loading users directory...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-muted-foreground">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrentAdmin = u.id === currentAdmin?.id;

                  return (
                    <tr key={u.id} className="transition-colors hover:bg-secondary/30">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-8 place-items-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                            {u.name?.slice(0, 2).toUpperCase() || "US"}
                          </div>
                          <div>
                            <span className="font-bold text-foreground">{u.name}</span>
                            {isCurrentAdmin && (
                              <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-extrabold text-primary">
                                (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-foreground">{u.email}</td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            u.role === "admin"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {u.role === "admin" ? (
                            <ShieldCheck className="size-3" />
                          ) : (
                            <Users className="size-3" />
                          )}
                          {u.role === "admin" ? "Administrator" : "Customer"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            u.accountStatus === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : u.accountStatus === "suspended"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {u.accountStatus || "active"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-muted-foreground">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle Role */}
                          <button
                            disabled={isCurrentAdmin}
                            onClick={() => promptToggleRole(u)}
                            className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium hover:bg-secondary disabled:opacity-40"
                          >
                            {u.role === "admin" ? "Make Customer" : "Make Admin"}
                          </button>

                          {/* Toggle Status */}
                          <button
                            disabled={isCurrentAdmin}
                            onClick={() => promptToggleStatus(u)}
                            className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-colors disabled:opacity-40 ${
                              u.accountStatus === "active"
                                ? "border border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                                : "border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                            }`}
                          >
                            {u.accountStatus === "active" ? "Suspend" : "Activate"}
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
            Showing {users.length} of {totalCount} accounts
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
