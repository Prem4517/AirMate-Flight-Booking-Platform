import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  Plane,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  User,
  Bell,
  ChevronDown,
  Ticket,
  Users,
  Sparkles,
  Gauge,
  Clock,
} from "lucide-react";
import { useStore, store } from "@/lib/store";

export default function Navbar() {
  const { user } = useStore();
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format user initials
  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "CU";
  };

  // Capitalized first name for elegant presentation
  const displayName = user
    ? user.name
      ? user.name.split(" ")[0].charAt(0).toUpperCase() +
        user.name.split(" ")[0].slice(1).toLowerCase()
      : user.email
      ? user.email.split("@")[0].charAt(0).toUpperCase() +
        user.email.split("@")[0].slice(1).toLowerCase()
      : "Traveler"
    : "";

  // Dynamic role-based navigation links
  const links = (() => {
    if (!user) {
      return [
        { to: "/", label: "Home" },
        { to: "/search", label: "Search Flights" },
      ];
    }
    if (user.role === "admin") {
      return [
        { to: "/", label: "Home" },
        { to: "/admin", label: "Operations Dashboard" },
        { to: "/search", label: "Flight Catalog" },
      ];
    }
    // Default Customer role
    return [
      { to: "/", label: "Home" },
      { to: "/search", label: "Search Flights" },
      { to: "/trips", label: "My Trips" },
    ];
  })();

  function handleLogout() {
    store.logout();
    setOpen(false);
    setDropdownOpen(false);
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid size-9 place-items-center rounded-xl sky-panel">
            <Plane className="size-4 -rotate-45" />
          </span>
          AirMate
        </Link>

        {/* Center menu links */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "bg-secondary text-secondary-foreground font-semibold" }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right action controls */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="flex items-center gap-2">
              {/* Notifications Bell */}
              {user.role === "customer" && (
                <Link
                  to="/trips"
                  search={{ tab: "notifications" }}
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(
                        new CustomEvent("airmate:switch-tab", { detail: "notifications" })
                      );
                    }
                  }}
                  className="relative rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title="Travel Alerts & Notifications"
                >
                  <Bell className="size-4" />
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
                </Link>
              )}

              {/* Modern User Profile Capsule with Dropdown Menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="group flex items-center gap-2.5 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-xs font-medium hover:border-primary/50 hover:bg-secondary/40 transition-all shadow-2xs cursor-pointer"
                >
                  {/* Circular Avatar with Gradient & Initials */}
                  <div className="grid size-7 place-items-center rounded-full bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground font-bold text-[11px] shadow-xs">
                    {getInitials(user.name, user.email)}
                  </div>

                  {/* User Name & Subtle Role */}
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-foreground leading-tight">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {user.role === "admin" ? "Admin" : "Traveler"}
                    </span>
                  </div>

                  <ChevronDown
                    className={`size-3 text-muted-foreground transition-transform duration-200 group-hover:text-foreground ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu - solid opaque background */}
                {dropdownOpen && (
                  <div
                    style={{ backgroundColor: "var(--color-card, #ffffff)" }}
                    className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-card p-2 text-xs shadow-2xl z-50 animate-in fade-in zoom-in-95"
                  >
                    {/* User Identity Header */}
                    <div className="px-3 py-2.5 border-b border-border/70 mb-1">
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-xs">
                          {getInitials(user.name, user.email)}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-foreground text-xs truncate">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            user.role === "admin"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-primary/15 text-primary"
                          }`}
                        >
                          <Sparkles className="size-2.5" />
                          {user.role === "admin" ? "Administrator" : "Verified Customer"}
                        </span>
                      </div>
                    </div>

                    {/* Menu Navigation Links */}
                    <div className="space-y-0.5">
                      {user.role === "admin" ? (
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors font-medium"
                        >
                          <ShieldCheck className="size-3.5 text-destructive" />
                          <span>Admin Console</span>
                        </Link>
                      ) : (
                        <>
                          <Link
                            to="/trips"
                            search={{ tab: "trips" }}
                            onClick={() => {
                              setDropdownOpen(false);
                              if (typeof window !== "undefined") {
                                window.dispatchEvent(
                                  new CustomEvent("airmate:switch-tab", { detail: "trips" })
                                );
                              }
                            }}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors font-medium cursor-pointer"
                          >
                            <Ticket className="size-3.5 text-primary" />
                            <span>My Trips & Bookings</span>
                          </Link>
                          <Link
                            to="/trips"
                            search={{ tab: "history" }}
                            onClick={() => {
                              setDropdownOpen(false);
                              if (typeof window !== "undefined") {
                                window.dispatchEvent(
                                  new CustomEvent("airmate:switch-tab", { detail: "history" })
                                );
                              }
                            }}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors font-medium cursor-pointer"
                          >
                            <Clock className="size-3.5 text-primary" />
                            <span>Booking History</span>
                          </Link>
                          <Link
                            to="/trips"
                            search={{ tab: "delay-prediction" }}
                            onClick={() => {
                              setDropdownOpen(false);
                              if (typeof window !== "undefined") {
                                window.dispatchEvent(
                                  new CustomEvent("airmate:switch-tab", { detail: "delay-prediction" })
                                );
                              }
                            }}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors font-medium cursor-pointer"
                          >
                            <Gauge className="size-3.5 text-primary" />
                            <span>Delay Prediction & Status</span>
                          </Link>
                          <Link
                            to="/trips"
                            search={{ tab: "profile" }}
                            onClick={() => {
                              setDropdownOpen(false);
                              if (typeof window !== "undefined") {
                                window.dispatchEvent(
                                  new CustomEvent("airmate:switch-tab", { detail: "profile" })
                                );
                              }
                            }}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors font-medium cursor-pointer"
                          >
                            <User className="size-3.5 text-primary" />
                            <span>Profile & Security</span>
                          </Link>
                          <Link
                            to="/trips"
                            search={{ tab: "passengers" }}
                            onClick={() => {
                              setDropdownOpen(false);
                              if (typeof window !== "undefined") {
                                window.dispatchEvent(
                                  new CustomEvent("airmate:switch-tab", { detail: "passengers" })
                                );
                              }
                            }}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors font-medium cursor-pointer"
                          >
                            <Users className="size-3.5 text-primary" />
                            <span>Saved Passengers</span>
                          </Link>
                          <Link
                            to="/trips"
                            search={{ tab: "notifications" }}
                            onClick={() => {
                              setDropdownOpen(false);
                              if (typeof window !== "undefined") {
                                window.dispatchEvent(
                                  new CustomEvent("airmate:switch-tab", {
                                    detail: "notifications",
                                  })
                                );
                              }
                            }}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors font-medium cursor-pointer"
                          >
                            <Bell className="size-3.5 text-primary" />
                            <span>Notifications & Alerts</span>
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Sign Out Action */}
                    <div className="mt-1 border-t border-border/70 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-destructive hover:bg-destructive/10 transition-colors cursor-pointer font-medium"
                      >
                        <LogOut className="size-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/admin-login"
                className="inline-flex items-center gap-1 rounded-lg border border-border/80 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <ShieldCheck className="size-3.5 text-destructive" /> Admin Portal
              </Link>
              <Link
                to="/auth"
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Login / Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          className="rounded-lg border border-border p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile menu dropdown */}
      {open ? (
        <div className="border-t border-border bg-background px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {user ? (
              <div className="mb-2 flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground font-bold text-[11px]">
                    {getInitials(user.name, user.email)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{user.email}</span>
                  </div>
                </div>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider " +
                    (user.role === "admin"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/15 text-primary")
                  }
                >
                  {user.role}
                </span>
              </div>
            ) : null}

            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                {l.label}
              </Link>
            ))}

            {user ? (
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-4" /> Sign Out
              </button>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground"
                >
                  Customer Login / Register
                </Link>
                <Link
                  to="/admin-login"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-center text-xs font-medium text-muted-foreground"
                >
                  <ShieldCheck className="size-3.5 text-destructive" /> Admin Portal
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
