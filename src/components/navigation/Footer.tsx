import Link from "next/link";
import { Instagram, Youtube, Twitter } from "lucide-react";

const explore = [
  { href: "/explore", label: "All Videos" },
  { href: "/characters", label: "Characters" },
  { href: "/collections", label: "Collections" },
  { href: "/explore?sort=trending", label: "Trending" },
];

const support = [
  { href: "/about", label: "About" },
  { href: "/account", label: "My Library" },
  { href: "/checkout", label: "Checkout" },
  { href: "/about#faq", label: "FAQ" },
];

const legal = [
  { href: "/about#terms", label: "Terms" },
  { href: "/about#privacy", label: "Privacy" },
  { href: "/about#licenses", label: "Licenses" },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Link
            href="/"
            className="font-display text-2xl font-bold tracking-tight text-text"
          >
            RHYTHM
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            A digital store for AI character dance videos — discover, collect,
            and create with motion that feels alive.
          </p>
          <div className="mt-6 flex gap-3">
            <SocialLink href="#" label="Instagram">
              <Instagram size={18} />
            </SocialLink>
            <SocialLink href="#" label="YouTube">
              <Youtube size={18} />
            </SocialLink>
            <SocialLink href="#" label="X">
              <Twitter size={18} />
            </SocialLink>
          </div>
        </div>

        <FooterCol title="Explore" links={explore} />
        <FooterCol title="Support" links={support} />
        <FooterCol title="Legal" links={legal} />
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} RHYTHM. All rights reserved.</p>
          <p>Digital content · Instant delivery</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-text-dim transition hover:text-accent"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-dim transition hover:border-accent/40 hover:text-accent"
    >
      {children}
    </a>
  );
}
