import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { ShieldCheck, Lock, Mail, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import { store, useStore } from "@/lib/store";
import { loginAdmin } from "@/services/api";

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useStore();

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Please provide both administrator email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await loginAdmin({
        email: form.email,
        password: form.password,
      });

      store.setUser(res.user, res.token);
      navigate({ to: "/admin" });
    } catch (err) {
      setError(err.message || "Administrator authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-4">
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Passenger Login
        </Link>
      </div>

      <div className="soft-card relative overflow-hidden border-border/80 p-6 sm:p-8 shadow-xl">
        {/* Admin top banner badge */}
        <div className="mb-6 flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-destructive/15 text-destructive">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-lg font-bold leading-tight">Operations Control</h1>
              <p className="text-xs text-muted-foreground">Restricted Administrative Access</p>
            </div>
          </div>
          <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-destructive">
            Admin Only
          </span>
        </div>

        {user && user.role === "admin" ? (
          <div className="mb-5 rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-foreground">
            You are currently signed in as administrator (<strong>{user.email}</strong>).
            <div className="mt-2">
              <Link
                to="/admin"
                className="inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                Go to Operations Dashboard →
              </Link>
            </div>
          </div>
        ) : user && user.role === "customer" ? (
          <div className="mb-5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">
            <span className="font-semibold">Note:</span> You are currently signed in as customer (
            <strong>{user.email}</strong>). You must authenticate with administrative credentials to access operations.
          </div>
        ) : null}

        <div className="mb-5 rounded-xl border border-border/60 bg-secondary/50 p-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
            <span>
              All administrative access and operations activity are logged. Public registration is not permitted on this portal.
            </span>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <Mail className="size-3.5 text-muted-foreground" /> Administrator Email
            </span>
            <input
              type="email"
              placeholder="admin@airmate.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <Lock className="size-3.5 text-muted-foreground" /> Administrator Password
            </span>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/20"
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Authenticate Administrator
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-border/60 bg-muted/40 p-3 text-center text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Initial Provisioned Admin Credentials:</p>
          <p className="mt-1 font-mono text-[11px]">admin@airmate.com · Admin@AirMate2026!</p>
        </div>
      </div>
    </div>
  );
}
