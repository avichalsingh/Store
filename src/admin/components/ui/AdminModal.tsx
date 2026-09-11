"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { AdminButton } from "./AdminButton";

export function AdminModal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  size,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** sm=lg, md=2xl, xl=5xl, full=almost viewport */
  size?: "sm" | "md" | "xl" | "full";
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const resolvedSize = size ?? (wide ? "md" : "sm");
  const sizeClass =
    resolvedSize === "full"
      ? "max-w-6xl"
      : resolvedSize === "xl"
        ? "max-w-5xl"
        : resolvedSize === "md"
          ? "max-w-2xl"
          : "max-w-lg";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`relative z-10 max-h-[90vh] w-full overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-lg)] ${sizeClass} ${className ?? ""}`}
      >
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-5 py-4">
          <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-[var(--admin-text)]">
            {title}
          </h2>
          <AdminButton variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </AdminButton>
        </div>
        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--admin-border)] px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <AdminButton variant="secondary" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton
            variant={danger ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </AdminButton>
        </>
      }
    >
      <p className="text-sm text-[var(--admin-muted)]">{description}</p>
    </AdminModal>
  );
}
