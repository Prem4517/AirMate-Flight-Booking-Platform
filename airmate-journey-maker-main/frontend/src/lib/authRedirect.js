/**
 * Safe post-login redirect helpers.
 * Never trust open redirects or browser-supplied booking permissions.
 */

export const PUBLIC_PATHS = [
  "/",
  "/search",
  "/flight-status",
  "/recommendations",
  "/baggage-calculator",
  "/auth",
  "/admin-login",
];

export function isPublicPath(pathname) {
  if (!pathname) return false;
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/flight/")) return true;
  return false;
}

export function sanitizeRedirect(redirect) {
  if (typeof redirect !== "string") return "/trips";
  const trimmed = redirect.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || /\\/.test(trimmed)) {
    return "/trips";
  }
  if (trimmed.includes("://") || trimmed.includes("\\")) return "/trips";
  if (trimmed.startsWith("/auth") || trimmed.startsWith("/admin")) return "/trips";
  return trimmed;
}

export function bookingRedirectFromDraft(draft, fallback = "/passengers") {
  if (!draft?.flight) return fallback;
  const id = draft.flight.id || draft.flight._id;
  const params = new URLSearchParams();
  if (id) params.set("flightId", String(id));
  if (draft.travelDate) params.set("date", draft.travelDate);
  if (draft.passengers) params.set("passengers", String(draft.passengers));
  if (draft.cabinClass) params.set("cabinClass", draft.cabinClass);
  const query = params.toString();
  return query ? `${fallback}?${query}` : fallback;
}

export function parseRedirectToNavigate(redirect) {
  const safe = sanitizeRedirect(redirect);
  const qIndex = safe.indexOf("?");
  const pathname = qIndex >= 0 ? safe.slice(0, qIndex) : safe;
  const search = {};
  if (qIndex >= 0) {
    new URLSearchParams(safe.slice(qIndex + 1)).forEach((value, key) => {
      search[key] = value;
    });
  }

  const flightMatch = pathname.match(/^\/flight\/([^/]+)$/);
  if (flightMatch) {
    return { to: "/flight/$id", params: { id: decodeURIComponent(flightMatch[1]) }, search };
  }

  const ticketMatch = pathname.match(/^\/ticket\/([^/]+)$/);
  if (ticketMatch) {
    return {
      to: "/ticket/$bookingId",
      params: { bookingId: decodeURIComponent(ticketMatch[1]) },
      search,
    };
  }

  return { to: pathname || "/trips", search };
}
