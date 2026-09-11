"use client";

import { useAdmin } from "@/admin/store/AdminProvider";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function ToastHost() {
  const { toasts, dismissToast } = useAdmin();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border px-3.5 py-3 shadow-[var(--admin-shadow-md)]",
              toast.tone === "success" &&
                "border-[var(--admin-success)]/20 bg-[var(--admin-surface)] text-[var(--admin-text)]",
              toast.tone === "error" &&
                "border-[var(--admin-danger)]/30 bg-[var(--admin-surface)] text-[var(--admin-text)]",
              toast.tone === "info" &&
                "border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text)]",
            )}
          >
            <span
              className={cn(
                "mt-1 h-2 w-2 shrink-0 rounded-full",
                toast.tone === "success" && "bg-[var(--admin-success)]",
                toast.tone === "error" && "bg-[var(--admin-danger)]",
                toast.tone === "info" && "bg-[var(--admin-info)]",
              )}
            />
            <p className="flex-1 text-sm">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
