"use client";

import { getAdminSession } from "@/admin/lib/auth";
import { signOutAdmin } from "@/admin/lib/signOutAdmin";
import { useAdmin } from "@/admin/store/AdminProvider";
import { Bell, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AdminButton } from "../ui/AdminButton";

export function AdminTopbar({
  title,
  children,
  onOpenSearch,
  leading,
}: {
  title?: string;
  children?: ReactNode;
  onOpenSearch: () => void;
  leading?: ReactNode;
}) {
  const router = useRouter();
  const { notifications, markAllNotificationsRead, markNotificationRead } = useAdmin();
  const [openNotifs, setOpenNotifs] = useState(false);
  const [email, setEmail] = useState("admin@rhythm.studio");

  useEffect(() => {
    const session = getAdminSession();
    if (session?.email) setEmail(session.email);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--admin-border)] bg-[var(--admin-bg)]/90 px-4 backdrop-blur md:px-6">
      {leading}
      <div className="min-w-0 flex-1">
        {children ?? (
          <p className="truncate font-[family-name:var(--font-syne)] text-sm font-semibold text-[var(--admin-text)]">
            {title ?? "Admin"}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden h-9 min-w-[220px] items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 text-left text-sm text-[var(--admin-muted)] hover:border-[var(--admin-accent)]/40 md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1">Search…</span>
        <kbd className="rounded-md bg-[var(--admin-surface-2)] px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>

      <AdminButton variant="ghost" size="sm" className="md:hidden" onClick={onOpenSearch}>
        <Search className="h-4 w-4" />
      </AdminButton>

      <div className="relative">
        <AdminButton
          variant="ghost"
          size="sm"
          onClick={() => setOpenNotifs((v) => !v)}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--admin-accent)]" />
          ) : null}
        </AdminButton>
        {openNotifs ? (
          <div className="absolute right-0 top-11 w-80 overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-lg)]">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-3 py-2">
              <p className="text-sm font-medium">Notifications</p>
              <button
                type="button"
                className="text-xs text-[var(--admin-accent)]"
                onClick={markAllNotificationsRead}
              >
                Mark all read
              </button>
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className="w-full border-b border-[var(--admin-border)] px-3 py-2.5 text-left last:border-0 hover:bg-[var(--admin-surface-2)]"
                    onClick={() => markNotificationRead(n.id)}
                  >
                    <p className="text-sm font-medium text-[var(--admin-text)]">{n.title}</p>
                    <p className="text-xs text-[var(--admin-muted)]">{n.body}</p>
                    {!n.read ? (
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--admin-accent)]" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-1.5"
        onClick={() => {
          if (confirm("Sign out of RHYTHM Admin?")) {
            void signOutAdmin().then(() => {
              router.replace("/admin/login");
            });
          }
        }}
        title="Sign out"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-xs font-semibold text-[var(--admin-accent)]">
          {email.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[120px] truncate text-xs text-[var(--admin-muted)] sm:block">
          {email}
        </span>
      </button>
    </header>
  );
}
