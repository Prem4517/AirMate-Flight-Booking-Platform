import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Admin from "@/pages/Admin.jsx";
import { useStore, store } from "@/lib/store";
import { ShieldAlert, Lock, ArrowLeft, Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — AirMate" },
      {
        name: "description",
        content: "Manage AirMate flights and aircraft, and review revenue, routes and occupancy analytics.",
      },
      { property: "og:title", content: "Admin dashboard — AirMate" },
      {
        property: "og:description",
        content: "Operations control centre for flights, bookings and revenue analytics.",
      },
    ],
  }),
  component: ProtectedAdminRoute,
});

function ProtectedAdminRoute() {
  const { user, authLoading } = useStore();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      navigate({ to: "/admin-login" });
    }
  }, [mounted, authLoading, user, navigate]);

  // Loading state (also matches during SSR & initial hydration)
  if (!mounted || authLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Verifying administrator credentials...
        </p>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Lock className="size-7" />
        </div>
        <h2 className="mt-4 font-display text-xl font-bold">Authentication Required</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Please authenticate with administrator credentials to access this area.
        </p>
        <Link
          to="/admin-login"
          className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Go to Administrator Login
        </Link>
      </div>
    );
  }

  // Signed in as Customer: ACCESS DENIED (403)
  if (user.role !== "admin") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
        <div className="grid size-16 place-items-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
          <ShieldAlert className="size-9" />
        </div>

        <span className="mt-4 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-destructive">
          403 Forbidden
        </span>

        <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Access Denied</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          You are signed in as a passenger account (<strong>{user.email}</strong>). This portal is restricted exclusively to authorized AirMate Operations Administrators.
        </p>

        <div className="mt-4 rounded-xl border border-border/80 bg-secondary/50 p-3.5 text-left text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Security Notice:</p>
          <p className="mt-1">
            Server-side role checking prevents unauthorized data access. Any manipulation of local application state will be rejected by the backend API.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary"
          >
            <ArrowLeft className="size-4" /> Return Home
          </Link>

          <Link
            to="/trips"
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary"
          >
            My Trips
          </Link>

          <button
            onClick={() => {
              store.logout();
              navigate({ to: "/admin-login" });
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
          >
            <LogOut className="size-4" /> Switch to Admin Account
          </button>
        </div>
      </div>
    );
  }

  // Authenticated Administrator: Render Dashboard
  return <Admin />;
}
