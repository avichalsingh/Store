"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useSiteContent } from "@/catalog/useSiteContent";
import { DEFAULT_SITE_NAVIGATION } from "@/catalog/siteContent";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  const path = href.split("?")[0]!.split("#")[0]!;
  return pathname === path || (path !== "/" && pathname.startsWith(path));
}

function NavHref({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { itemCount, openCart, bumpKey } = useCart();
  const site = useSiteContent();
  const primaryLinks =
    site.primaryNav.length > 0
      ? site.primaryNav
      : DEFAULT_SITE_NAVIGATION.primary;
  const moreLinks =
    site.moreNav.length > 0 ? site.moreNav : DEFAULT_SITE_NAVIGATION.more;
  const moreLabel =
    site.navigation.moreLabel?.trim() || DEFAULT_SITE_NAVIGATION.moreLabel;

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (bumpKey === 0) return;
    setCartBump(true);
    const t = window.setTimeout(() => setCartBump(false), 600);
    return () => window.clearTimeout(t);
  }, [bumpKey]);

  useEffect(() => {
    if (!moreOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && moreRef.current?.contains(target)) return;
      setMoreOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };

    // Defer so the opening click does not immediately dismiss the menu.
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  const moreActive = moreLinks.some((l) => isActive(pathname, l.href));

  return (
    <header className="fixed inset-x-0 top-0 z-50 py-3 sm:py-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            /* Clip only while the mobile drawer is open so desktop More
               can escape the rounded shell without being cut off. */
            mobileOpen ? "overflow-hidden" : "overflow-visible",
            "rounded-[1.5rem] border border-border bg-surface text-text",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]",
            "transition-[background-color,border-color,box-shadow,color] duration-300",
            scrolled &&
              "shadow-[0_2px_8px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.12)]",
          )}
        >
          <div className="flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3">
            <Link
              href="/"
              aria-label="PRAGVI"
              className="shrink-0 font-display text-xl font-bold tracking-tight sm:text-2xl"
            >
              <span className="text-accent">PRA</span>
              <span className="text-text">GVI</span>
            </Link>

            <nav
              className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex"
              aria-label="Main"
            >
              {primaryLinks.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <NavHref
                    key={link.id}
                    href={link.href}
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "text-accent"
                        : "text-text-dim hover:text-text",
                    )}
                  >
                    {link.label}
                  </NavHref>
                );
              })}
              {moreLinks.length > 0 && (
                <div
                  ref={moreRef}
                  className="relative"
                  onMouseEnter={() => setMoreOpen(true)}
                  onMouseLeave={() => setMoreOpen(false)}
                >
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors",
                      moreActive || moreOpen
                        ? "text-accent"
                        : "text-text-dim hover:text-text",
                    )}
                    aria-expanded={moreOpen}
                    aria-haspopup="true"
                    onClick={() => setMoreOpen((v) => !v)}
                  >
                    {moreLabel}
                    <ChevronDown size={14} />
                  </button>
                  {moreOpen && (
                    <div className="absolute left-1/2 top-full z-[100] min-w-[180px] -translate-x-1/2 pt-2">
                      <div className="rounded-2xl border border-border bg-surface p-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
                        {moreLinks.map((link) => (
                          <NavHref
                            key={link.id}
                            href={link.href}
                            className={cn(
                              "block rounded-xl px-3 py-2 text-sm transition hover:bg-surface-2",
                              isActive(pathname, link.href)
                                ? "font-semibold text-accent"
                                : "text-text-dim hover:text-text",
                            )}
                          >
                            {link.label}
                          </NavHref>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={openCart}
                aria-label={`Open cart, ${itemCount} items`}
                className={cn(
                  "relative rounded-full p-2.5 text-text-dim transition hover:bg-surface-2 hover:text-text",
                  cartBump && "animate-cart-pop",
                )}
              >
                <ShoppingBag size={18} />
                {itemCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </button>
              <Link
                href="/account"
                aria-label="Account"
                className="hidden items-center gap-2 rounded-full border border-border bg-surface-2/60 px-3.5 py-2 text-sm font-medium text-text transition hover:border-accent/40 hover:text-accent sm:inline-flex"
              >
                <User size={16} />
                Account
              </Link>
              <Link
                href="/explore"
                aria-label="Search"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-3.5 text-sm font-semibold text-white transition hover:brightness-110 sm:px-4"
              >
                <Search size={16} />
                <span className="hidden md:inline">Explore</span>
              </Link>
              <button
                type="button"
                className="rounded-full p-2.5 text-text-dim transition hover:bg-surface-2 hover:text-text xl:hidden"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="border-t border-border px-3 pb-3 pt-1 xl:hidden">
              <nav className="flex flex-col gap-0.5" aria-label="Mobile">
                {primaryLinks.map((link) => (
                  <NavHref
                    key={link.id}
                    href={link.href}
                    className={cn(
                      "rounded-xl px-3 py-3 text-base font-medium transition hover:bg-surface-2",
                      isActive(pathname, link.href)
                        ? "text-accent"
                        : "text-text",
                    )}
                  >
                    {link.label}
                  </NavHref>
                ))}
                {moreLinks.length > 0 && (
                  <>
                    <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      {moreLabel}
                    </p>
                    {moreLinks.map((link) => (
                      <NavHref
                        key={link.id}
                        href={link.href}
                        className={cn(
                          "rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-surface-2",
                          isActive(pathname, link.href)
                            ? "text-accent"
                            : "text-text-dim hover:text-text",
                        )}
                      >
                        {link.label}
                      </NavHref>
                    ))}
                  </>
                )}
                <Link
                  href="/account"
                  className="rounded-xl px-3 py-3 text-base font-medium text-text transition hover:bg-surface-2 sm:hidden"
                >
                  Account
                </Link>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
