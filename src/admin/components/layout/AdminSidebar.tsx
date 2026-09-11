"use client";

import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  ExternalLink,
  Film,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Tag,
  Users,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getAdminSession } from "@/admin/lib/auth";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const groups: Array<{ label?: string; items: NavItem[] }> = [
  {
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/products", label: "Products", icon: Clapperboard },
      { href: "/admin/characters", label: "Characters", icon: Users },
      { href: "/admin/collections", label: "Collections", icon: Package },
      { href: "/admin/bundles", label: "Bundles", icon: ShoppingBag },
      { href: "/admin/media", label: "Media Library", icon: Film },
      { href: "/admin/tools", label: "AI Tools", icon: Wrench },
      { href: "/admin/tools/monitoring", label: "Tools Monitoring", icon: Activity },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/admin/homepage", label: "Homepage", icon: LayoutTemplate },
      { href: "/admin/campaigns", label: "Trending & Campaigns", icon: Megaphone },
      { href: "/admin/pricing", label: "Pricing & Offers", icon: Tag },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { href: "/admin/customers", label: "Customers", icon: UsersRound },
    ],
  },
  {
    label: "System",
    items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  // Keep /admin/tools from highlighting when on monitoring
  if (href === "/admin/tools") {
    return (
      pathname === "/admin/tools" ||
      (pathname.startsWith("/admin/tools/") &&
        !pathname.startsWith("/admin/tools/monitoring"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavBody({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [profile, setProfile] = useState({ name: "Admin", email: "admin@rhythm.studio" });

  useEffect(() => {
    const session = getAdminSession();
    if (session) {
      setProfile({
        name: session.name || "Admin",
        email: session.email || "admin@rhythm.studio",
      });
    }
  }, []);

  return (
    <>
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-[var(--admin-border)] px-3",
          collapsed && "justify-center"
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--admin-accent)] text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-syne)] text-sm font-semibold tracking-wide">
              RHYTHM
            </p>
            <p className="inline-flex items-center gap-1 truncate text-[11px] text-[var(--admin-muted)]">
              <span className="rounded-full bg-[var(--admin-accent-soft)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--admin-accent)]">
                Admin
              </span>
            </p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group, gi) => (
          <div key={group.label ?? `g-${gi}`} className="mb-3">
            {group.label && !collapsed ? (
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-muted)]">
                {group.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-[var(--admin-accent-soft)] font-medium text-[var(--admin-accent)]"
                          : "text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-[var(--admin-border)] p-2">
        {!collapsed ? (
          <div className="mb-1 flex items-center gap-2.5 rounded-xl px-2.5 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-xs font-semibold text-[var(--admin-accent)]">
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--admin-text)]">
                {profile.name}
              </p>
              <p className="truncate text-[11px] text-[var(--admin-muted)]">
                {profile.email}
              </p>
            </div>
          </div>
        ) : null}
        <Link
          href="/"
          target="_blank"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]",
            collapsed && "justify-center px-0"
          )}
          title="View Store"
        >
          <ExternalLink className="h-4 w-4" />
          {!collapsed ? <span>View Store</span> : null}
        </Link>
        <Link
          href="/admin/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]",
            collapsed && "justify-center px-0"
          )}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
          {!collapsed ? <span>Settings</span> : null}
        </Link>
      </div>
    </>
  );
}

export function AdminSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    onMobileClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-[var(--admin-border)] bg-[var(--admin-surface)] transition-[width] md:flex",
          collapsed ? "w-[72px]" : "w-[248px]"
        )}
      >
        <NavBody collapsed={collapsed} />
        <div className="border-t border-[var(--admin-border)] p-2">
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]",
              collapsed && "justify-center px-0"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={onMobileClose}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-[var(--admin-surface)] shadow-[var(--admin-shadow-lg)] animate-[slide-up_0.25s_ease]">
            <div className="flex h-14 items-center justify-between border-b border-[var(--admin-border)] px-3">
              <p className="font-[family-name:var(--font-syne)] text-sm font-semibold">
                Menu
              </p>
              <button
                type="button"
                onClick={onMobileClose}
                className="rounded-lg p-2 text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavBody collapsed={false} onNavigate={onMobileClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-2 text-[var(--admin-muted)] md:hidden"
      aria-label="Open menu"
    >
      <Menu className="h-4 w-4" />
    </button>
  );
}
