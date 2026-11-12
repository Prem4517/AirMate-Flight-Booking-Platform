import { useState, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Plane,
  Ticket,
  Clock,
  Users,
  User,
  Bell,
  Heart,
  Tag,
  Luggage,
  LifeBuoy,
  RefreshCw,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Search,
  Sparkles,
  Gauge,
} from "lucide-react";
import { useStore, store } from "@/lib/store";
import { fetchMyBookings, fetchUserNotifications } from "@/services/api";

import MyTripsTab from "./MyTripsTab";
import BookingHistoryTab from "./BookingHistoryTab";
import SavedPassengersTab from "./SavedPassengersTab";
import ProfileTab from "./ProfileTab";
import NotificationsTab from "./NotificationsTab";
import SavedFlightsTab from "./SavedFlightsTab";
import PromoCodesTab from "./PromoCodesTab";
import BaggageCalculatorTab from "./BaggageCalculatorTab";
import SupportTab from "./SupportTab";
import DelayPredictionTab from "./DelayPredictionTab";

export default function CustomerDashboard({ initialTab = "trips" }) {
  const { user, bookings } = useStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const loadData = async () => {
    if (!user) return;
    setLoadingBookings(true);
    try {
      await store.refreshBookings();
      const notifs = await fetchUserNotifications().catch(() => []);
      if (Array.isArray(notifs)) {
        setUnreadNotifs(notifs.filter((n) => !n.read).length);
      }
    } catch (err) {
      console.warn("Dashboard sync error:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const routerSearch = useRouterState({ select: (s) => s.location.search });
  const searchTab = routerSearch?.tab;

  // React to router search parameter changes (e.g., from Navbar dropdown)
  useEffect(() => {
    if (searchTab) {
      setActiveTab(searchTab);
    }
  }, [searchTab]);

  // Synchronize with custom event dispatched from same-page navigation
  useEffect(() => {
    const handleSwitchTab = (e) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener("airmate:switch-tab", handleSwitchTab);
    return () => window.removeEventListener("airmate:switch-tab", handleSwitchTab);
  }, []);

  // Check URL hash or query on initial mount or popstate
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handlePopState = () => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get("tab");
        const hash = window.location.hash.slice(1);
        if (tabParam) {
          setActiveTab(tabParam);
        } else if (hash) {
          setActiveTab(hash);
        }
      };

      handlePopState();
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, []);

  const changeTab = (tabId) => {
    setActiveTab(tabId);
    navigate({ to: "/trips", search: { tab: tabId } });
  };

  // Handle hash navigation (e.g., from Home page feature card)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleHashChange = () => {
        const hash = window.location.hash.slice(1);
        if (hash) {
          setActiveTab(hash);
        }
      };

      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    }
  }, []);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="grid size-14 mx-auto place-items-center rounded-2xl bg-secondary text-primary">
          <Plane className="size-7 -rotate-45" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Sign in to your travel dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Access your personal bookings, boarding passes, saved travellers, and delay forecasts.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm"
          >
            Customer Login / Register
          </Link>
          <Link
            to="/search"
            className="rounded-xl border border-border px-5 py-2.5 text-xs font-semibold hover:bg-secondary"
          >
            Search Flights
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "trips", label: "My Trips", icon: Plane, badge: bookings.filter((b) => b.bookingStatus !== "cancelled").length },
    { id: "delay-prediction", label: "Delay Prediction", icon: Gauge },
    { id: "history", label: "Booking History", icon: Clock },
    { id: "passengers", label: "Saved Travellers", icon: Users },
    { id: "profile", label: "Profile & Security", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadNotifs > 0 ? unreadNotifs : null, badgeTone: "primary" },
    { id: "saved-flights", label: "Saved Flights & Alerts", icon: Heart },
    { id: "promos", label: "Promo Codes & Deals", icon: Tag },
    { id: "baggage", label: "Baggage Calculator", icon: Luggage },
    { id: "support", label: "Support Desk", icon: LifeBuoy },
  ];

  return (
    <div className="min-h-[85vh] bg-background">
      {/* Top Traveler Banner */}
      <div className="border-b border-border bg-card/60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground font-display font-black text-lg shadow-sm">
                {user.name ? user.name.slice(0, 2).toUpperCase() : "CU"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl sm:text-2xl font-black text-foreground">
                    Welcome back, {user.name ? user.name.split(" ")[0] : "Traveler"}
                  </h1>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold text-primary uppercase">
                    Verified Customer
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Account: <strong>{user.email}</strong> · Seamless travel & booking manager
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                to="/search"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-95"
              >
                <Search className="size-3.5" /> Book a Flight
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout with Left Sidebar in Order */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-start">
          {/* Left-Side Navigation Sidebar */}
          <aside className="w-full">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-xs sticky top-20">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Dashboard Menu
              </div>
              <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0 scrollbar-none">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => changeTab(tab.id)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all text-left w-full ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="flex-1">{tab.label}</span>
                      {tab.badge !== null && tab.badge !== undefined && (
                        <span
                          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            isActive
                              ? "bg-primary-foreground text-primary"
                              : tab.badgeTone === "primary"
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Right-Side Tab View Content */}
          <main className="min-w-0">
            {activeTab === "trips" && (
              <MyTripsTab
                bookings={bookings}
                loading={loadingBookings}
                onRefresh={loadData}
              />
            )}

            {activeTab === "delay-prediction" && (
              <DelayPredictionTab bookings={bookings} />
            )}

            {activeTab === "history" && (
              <BookingHistoryTab bookings={bookings} />
            )}

            {activeTab === "passengers" && (
              <SavedPassengersTab />
            )}

            {activeTab === "profile" && (
              <ProfileTab user={user} />
            )}

            {activeTab === "notifications" && (
              <NotificationsTab />
            )}

            {activeTab === "saved-flights" && (
              <SavedFlightsTab />
            )}

            {activeTab === "promos" && (
              <PromoCodesTab />
            )}

            {activeTab === "baggage" && (
              <BaggageCalculatorTab />
            )}

            {activeTab === "support" && (
              <SupportTab userBookings={bookings} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
