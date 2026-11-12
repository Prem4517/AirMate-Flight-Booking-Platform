import { useState } from "react";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { Plane, Lock, Mail, User, ShieldCheck, Loader2 } from "lucide-react";
import { store, useStore } from "@/lib/store";
import { loginCustomer, registerCustomer } from "@/services/api";
import { parseRedirectToNavigate, sanitizeRedirect } from "@/lib/authRedirect";

export default function Auth() {
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useStore();

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password || (mode === "register" && (!form.name || !form.confirmPassword))) {
      setError("Please fill in all required fields.");
      return;
    }

    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    if (!gmailRegex.test(form.email.trim())) {
      setError("Email must be in the format of @gmail.com (e.g. name@gmail.com).");
      return;
    }

    if (mode === "register") {
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const res = await loginCustomer({
          email: form.email,
          password: form.password,
        });
        store.setUser(res.user, res.token);
        navigate(parseRedirectToNavigate(search.redirect));
      } else {
        const res = await registerCustomer({
          name: form.name,
          email: form.email,
          password: form.password,
        });
        store.setUser(res.user, res.token);
        navigate(parseRedirectToNavigate(search.redirect));
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-2 md:items-center">
      <div className="hidden rounded-3xl sky-panel p-10 md:block">
        <Plane className="size-8 -rotate-45" />
        <h1 className="mt-6 font-display text-3xl font-bold">Welcome aboard AirMate</h1>
        <p className="mt-3 opacity-90">
          Sign in or create your customer account to manage flight reservations, pick seats, track baggage, and view live boarding passes.
        </p>

        <div className="mt-8 space-y-3 text-sm opacity-90">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            <span>Secure password encryption & session management</span>
          </div>
          <div className="flex items-center gap-2">
            <Plane className="size-4" />
            <span>Personalized itineraries & live delay forecasting</span>
          </div>
        </div>
      </div>

      <div className="soft-card p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">
              {mode === "login" ? "Customer Login" : "Create Customer Account"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {mode === "login"
                ? "Enter your customer credentials to sign in"
                : "Register for a new AirMate customer account"}
            </p>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            Customer Portal
          </span>
        </div>

        {user && user.role === "customer" ? (
          <div className="mb-4 rounded-xl bg-success/15 p-3 text-xs text-foreground">
            Signed in as <strong>{user.email}</strong>.
          </div>
        ) : null}

        <div className="mb-6 flex rounded-xl bg-secondary p-1">
          {["login", "register"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
                setForm({ name: "", email: "", password: "", confirmPassword: "" });
              }}
              className={
                "flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors " +
                (mode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")
              }
            >
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" ? (
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                <User className="size-3.5 text-muted-foreground" /> Full Name
              </span>
              <input
                type="text"
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <Mail className="size-3.5 text-muted-foreground" /> Email Address
            </span>
            <input
              type="email"
              placeholder="name@gmail.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <Lock className="size-3.5 text-muted-foreground" /> Password
            </span>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </label>

          {mode === "register" ? (
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                <Lock className="size-3.5 text-muted-foreground" /> Confirm Password
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </label>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "login" ? "Sign In as Customer" : "Create Customer Account"}
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Looking for operations or staff login?{" "}
            <Link to="/admin-login" className="font-semibold text-primary underline underline-offset-4">
              Administrator Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function getRedirectPath(redirect) {
  return sanitizeRedirect(redirect);
}
