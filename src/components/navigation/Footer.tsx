"use client";

import Link from "next/link";
import { Instagram, Youtube, Twitter } from "lucide-react";
import { useSiteContent } from "@/catalog/useSiteContent";
import {
  formatCopyright,
  getEnabledFooterLinks,
  getVisibleSocialLinks,
  type SiteFooterLink,
  type SiteSocialLink,
} from "@/catalog/siteContent";

const SOCIAL_ICONS: Record<
  SiteSocialLink["id"],
  React.ComponentType<{ size?: number }>
> = {
  instagram: Instagram,
  youtube: Youtube,
  x: Twitter,
};

export function Footer() {
  const { footer } = useSiteContent();
  const social = getVisibleSocialLinks(footer.social);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t border-border bg-bg">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Link
            href="/"
            aria-label="PRAGVI"
            className="font-display text-2xl font-bold tracking-tight"
          >
            <span className="text-accent">PRA</span>
            <span className="text-text">GVI</span>
          </Link>
          {footer.tagline.trim() ? (
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {footer.tagline}
            </p>
          ) : null}
          <div className="mt-5 h-px max-w-[180px] bg-border" />
          {social.length > 0 ? (
            <>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {footer.followLabel}
              </p>
              <div className="mt-3 flex gap-3">
                {social.map((item) => {
                  const Icon = SOCIAL_ICONS[item.id];
                  return (
                    <SocialLink
                      key={item.id}
                      href={item.href}
                      label={item.label}
                    >
                      <Icon size={18} />
                    </SocialLink>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {footer.groups.map((group) => {
          const links = getEnabledFooterLinks(group.links);
          if (links.length === 0) return null;
          return (
            <FooterCol key={group.id} title={group.title} links={links} />
          );
        })}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>{formatCopyright(footer.copyright, year)}</p>
          {footer.secondaryLine.trim() ? (
            <p>{footer.secondaryLine}</p>
          ) : null}
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
  links: SiteFooterLink[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-text">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.id}>
            <FooterHref href={link.href} label={link.label} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterHref({ href, label }: { href: string; label: string }) {
  const external = /^https?:\/\//i.test(href);
  const className = "text-sm text-muted transition hover:text-accent";
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
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
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-dim transition hover:border-accent/40 hover:text-accent"
    >
      {children}
    </a>
  );
}
