// Stub for Lovable error reporting — no-op in self-hosted / local dev environments.
// Replace with your own error tracking (e.g. Sentry, Datadog) if needed.

/**
 * Report an error to an external monitoring service.
 * @param {Error} error
 * @param {Record<string, unknown>} [context]
 */
export function reportLovableError(error, context) {
  // In local / self-hosted mode this is intentionally a no-op.
  // Errors are already logged to the console via error-capture.js.
  if (import.meta.env.DEV) {
    console.warn("[lovable-error-reporting] Error reported:", error, context);
  }
}
