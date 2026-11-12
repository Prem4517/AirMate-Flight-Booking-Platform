import { AlertTriangle, Info, Trash2, X } from "lucide-react";

export default function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // "danger" | "warning" | "info"
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`grid size-12 shrink-0 place-items-center rounded-xl ${
              isDanger
                ? "bg-destructive/15 text-destructive"
                : isWarning
                ? "bg-amber-500/15 text-amber-500"
                : "bg-primary/15 text-primary"
            }`}
          >
            {isDanger ? (
              <Trash2 className="size-6" />
            ) : isWarning ? (
              <AlertTriangle className="size-6" />
            ) : (
              <Info className="size-6" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
              isDanger
                ? "bg-destructive hover:bg-destructive/90"
                : isWarning
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
