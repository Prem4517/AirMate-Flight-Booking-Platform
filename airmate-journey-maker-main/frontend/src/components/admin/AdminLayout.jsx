import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Plane,
  LayoutDashboard,
  Ticket,
  Users,
  BarChart3,
  ShieldCheck,
  LogOut,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Database,
  Download,
  Clock,
  Menu,
  X,
  LifeBuoy,
} from "lucide-react";
import { useStore, store } from "@/lib/store";
import { fetchAdminOverview, downloadAdminCsv } from "@/services/api";
import AdminOverviewTab from "./AdminOverviewTab";
import AdminFlightsTab from "./AdminFlightsTab";
import AdminBookingsTab from "./AdminBookingsTab";
import AdminUsersTab from "./AdminUsersTab";
import AdminAnalyticsTab from "./AdminAnalyticsTab";
import AdminAuditLogsTab from "./AdminAuditLogsTab";
import AdminSupportTab from "./AdminSupportTab";
import { toast } from "sonner";

export default function AdminLayout() {
  const { user } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Live Operational Clock (IST & UTC)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadOverview = async () => {
    try {
      const data = await fetchAdminOverview();
      setOverview(data);
    } catch (err) {
      console.warn("Failed to load overview data:", err.message);
    } finally {
      setLoadingOverview(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadOverview().then(() => {
      toast.success("Operations cockpit metrics refreshed");
    });
  };

  const handleLogout = () => {
    store.logout();
    toast.info("Administrator logged out");
    navigate({ to: "/admin-login" });
  };

  const navItems = [
    { id: "overview", label: "Operations Overview", icon: LayoutDashboard },
    { id: "flights", label: "Flight Management", icon: Plane },
    { id: "bookings", label: "Booking Manifests", icon: Ticket },
    { id: "users", label: "User Directory", icon: Users },
    { id: "analytics", label: "Revenue & Analytics", icon: BarChart3 },
    { id: "support", label: "Support Inbox", icon: LifeBuoy },
    { id: "audit", label: "Security Audit Logs", icon: ShieldCheck },
  ];

  const handleExport = async (type) => {
    setExportOpen(false);
    try {
      await downloadAdminCsv(type);
      toast.success(`${type} CSV exported successfully`);
    } catch (err) {
      toast.error(err.message || "Export failed");
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-sans antialiased text-foreground">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-0 -translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Plane className="size-5 rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-foreground">AirMate</span>
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary">
                  Ops Cockpit
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">Airline Operations Portal</p>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Control Center
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Link to Passenger Portal */}
        <div className="border-t border-border p-4">
          <Link
            to="/"
            target="_blank"
            className="flex w-full items-center justify-between rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="size-3.5" /> Passenger Site
            </span>
            <span className="text-[10px] text-muted-foreground">Customer View ↗</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary lg:hidden"
            >
              <Menu className="size-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-foreground sm:text-base capitalize">
                  {navItems.find((n) => n.id === activeTab)?.label || "Overview"}
                </h1>
                <span className="hidden sm:inline-block text-muted-foreground/40">/</span>
                <span className="hidden text-xs text-muted-foreground sm:inline-block">
                  Live Cockpit
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time UTC / IST Clock */}
            <div className="hidden items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground md:flex">
              <Clock className="size-3.5 text-primary" />
              <span>
                <strong className="text-foreground">IST:</strong>{" "}
                {currentTime.toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour12: false,
                })}
              </span>
              <span className="text-border">|</span>
              <span>
                <strong className="text-foreground">UTC:</strong>{" "}
                {currentTime.toLocaleTimeString("en-GB", { timeZone: "UTC", hour12: false })}
              </span>
            </div>

            {/* Quick CSV Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setExportOpen(!exportOpen)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>

              {exportOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card p-1 shadow-xl z-50">
                  <button
                    onClick={() => handleExport("flights")}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-secondary text-left"
                  >
                    <Plane className="size-3.5 text-blue-500" /> Export Flights CSV
                  </button>
                  <button
                    onClick={() => handleExport("bookings")}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-secondary text-left"
                  >
                    <Ticket className="size-3.5 text-emerald-500" /> Export Bookings CSV
                  </button>
                  <button
                    onClick={() => handleExport("users")}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-secondary text-left"
                  >
                    <Users className="size-3.5 text-indigo-500" /> Export Users CSV
                  </button>
                  <button
                    onClick={() => handleExport("audit-logs")}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-secondary text-left"
                  >
                    <ShieldCheck className="size-3.5 text-purple-500" /> Export Audit Trail CSV
                  </button>
                </div>
              )}
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh live metrics"
              className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-1.5 pr-2.5 hover:bg-secondary"
              >
                <div className="grid size-7 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                  {user?.name?.slice(0, 2).toUpperCase() || "AD"}
                </div>
                <div className="hidden text-left sm:block">
                  <div className="text-xs font-bold text-foreground leading-none">
                    {user?.name || "Admin"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Operations Admin</div>
                </div>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border bg-card p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="border-b border-border/60 p-2.5">
                    <p className="text-xs font-bold text-foreground">{user?.name || "System Admin"}</p>
                    <p className="text-[11px] text-muted-foreground">{user?.email || "admin@airmate.com"}</p>
                    <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                      Role: Operations Controller
                    </span>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setActiveTab("audit");
                        setProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <ShieldCheck className="size-3.5" /> View Audit Records
                    </button>
                    <Link
                      to="/"
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <ExternalLink className="size-3.5" /> Customer Flight Discovery
                    </Link>
                  </div>

                  <div className="border-t border-border/60 p-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="size-3.5" /> Sign Out of Ops Portal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Tab View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {activeTab === "overview" && (
            <AdminOverviewTab
              overview={overview}
              loading={loadingOverview}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "flights" && (
            <AdminFlightsTab onRefreshMetrics={loadOverview} />
          )}

          {activeTab === "bookings" && (
            <AdminBookingsTab onRefreshMetrics={loadOverview} />
          )}

          {activeTab === "users" && (
            <AdminUsersTab onRefreshMetrics={loadOverview} />
          )}

          {activeTab === "analytics" && <AdminAnalyticsTab />}

          {activeTab === "audit" && <AdminAuditLogsTab />}

          {activeTab === "support" && <AdminSupportTab />}
        </main>
      </div>
    </div>
  );
}
