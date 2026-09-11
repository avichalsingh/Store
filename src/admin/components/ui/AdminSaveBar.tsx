"use client";

import { AdminButton } from "./AdminButton";

export function AdminSaveBar({
  dirty,
  onSave,
  onDiscard,
  savingLabel = "Save changes",
  message = "Unsaved changes",
}: {
  dirty: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  savingLabel?: string;
  message?: string;
}) {
  if (!dirty) return null;

  return (
    <div className="sticky bottom-4 z-30 mx-auto mt-6 flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)]/95 px-4 py-3 shadow-[var(--admin-shadow-md)] backdrop-blur">
      <p className="text-sm text-[var(--admin-muted)]">{message}</p>
      <div className="flex items-center gap-2">
        {onDiscard ? (
          <AdminButton variant="ghost" size="sm" onClick={onDiscard}>
            Discard
          </AdminButton>
        ) : null}
        <AdminButton variant="primary" size="sm" onClick={onSave}>
          {savingLabel}
        </AdminButton>
      </div>
    </div>
  );
}
