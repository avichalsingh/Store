"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/characters", label: "Characters" },
  { href: "/collections", label: "Collections" },
  { href: "/explore?sort=trending", label: "Trending" },
];

const toolsLink = { href: "/tools", label: "Tools" };
const aboutLink = { href: "/about", label: "About" };

const shopLinks = [
  { href: "/videos", label: "Videos" },
  { href: "/images", label: "Images" },
  { href: "/prompts", label: "Prompts" },
  { href: "/captions", label: "Caption Packs" },
  { href: "/bundles", label: "Bundles" },
];

function NavTextLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active =
    pathname === href ||
    (href !== "/" && pathname.startsWith(href.split("?")[0]));
  return (
    <Link
      href={href}
      className={cn(
        "nav-link text-sm font-medium transition",
        active ? "nav-link-active text-accent" : "text-text-dim hover:text-text",
      )}
    >
      {label}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { itemCount, openCart, bumpKey } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [cartBump, setCartBump] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setShopOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (bumpKey === 0) return;
    setCartBump(true);
    const t = window.setTimeout(() => setCartBump(false), 600);
    return () => window.clearTimeout(t);
  }, [bumpKey]);

  const shopActive = shopLinks.some(
    (l) => pathname === l.href || pathname.startsWith(`${l.href}/`),
  );
  const toolsActive =
    pathname === toolsLink.href || pathname.startsWith(`${toolsLink.href}/`);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-bg/85 py-3 backdrop-blur-xl"
          : "bg-transparent py-5",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-tight text-text sm:text-2xl"
        >
          RHYTHM
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {primaryLinks.map((link) => (
            <NavTextLink
              key={link.href}
              href={link.href}
              label={link.label}
              pathname={pathname}
            />
          ))}
          <div
            className="relative"
            onMouseEnter={() => setShopOpen(true)}
            onMouseLeave={() => setShopOpen(false)}
          >
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 text-sm font-medium transition",
                shopActive || shopOpen
                  ? "text-accent"
                  : "text-text-dim hover:text-text",
              )}
              aria-expanded={shopOpen}
              aria-haspopup="true"
              onClick={() => setShopOpen((v) => !v)}
            >
              Shop
              <ChevronDown size={14} />
            </button>
            {shopOpen && (
              <div className="absolute left-0 top-full z-50 min-w-[180px] pt-2">
                <div className="rounded-2xl border border-border bg-surface p-2 shadow-xl">
                  {shopLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "block rounded-xl px-3 py-2 text-sm transition hover:bg-surface-2",
                        pathname.startsWith(link.href)
                          ? "font-semibold text-accent"
                          : "text-text-dim hover:text-text",
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link
            href={toolsLink.href}
            className={cn(
              "nav-link text-sm font-medium transition",
              toolsActive
                ? "nav-link-active text-accent"
                : "text-text-dim hover:text-text",
            )}
          >
            {toolsLink.label}
          </Link>
          <NavTextLink
            href={aboutLink.href}
            label={aboutLink.label}
            pathname={pathname}
          />
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/explore"
            aria-label="Search"
            className="rounded-full p-2.5 text-text-dim transition hover:bg-surface-2 hover:text-text"
          >
            <Search size={18} />
          </Link>
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
            className="hidden rounded-full border border-border px-3.5 py-2 text-sm font-medium text-text transition hover:border-accent/40 hover:text-accent sm:inline-flex sm:items-center sm:gap-2"
          >
            <User size={16} />
            Account
          </Link>
          <button
            type="button"
            className="rounded-full p-2.5 text-text-dim md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-bg/95 px-4 py-4 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-3 text-base font-medium text-text hover:bg-surface-2"
              >
                {link.label}
              </Link>
            ))}
            <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Shop
            </p>
            {shopLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-text-dim hover:bg-surface-2 hover:text-text"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={toolsLink.href}
              className="rounded-xl px-3 py-3 text-base font-medium text-text hover:bg-surface-2"
            >
              {toolsLink.label}
            </Link>
            <Link
              href={aboutLink.href}
              className="rounded-xl px-3 py-3 text-base font-medium text-text hover:bg-surface-2"
            >
              {aboutLink.label}
            </Link>
            <Link
              href="/account"
              className="rounded-xl px-3 py-3 text-base font-medium text-text hover:bg-surface-2"
            >
              Account
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
