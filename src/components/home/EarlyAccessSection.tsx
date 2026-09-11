"use client";

import { useState } from "react";

export function EarlyAccessSection() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-surface-2 via-surface to-accent/20 px-6 py-14 ring-1 ring-border sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Don&apos;t miss the drop
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-text sm:text-5xl">
            Don&apos;t miss the next move.
          </h2>
          <p className="mt-4 text-base text-muted">
            New characters. New dances. New content formats.
            <br className="hidden sm:block" />
            Get early access to new releases and launch pricing.
          </p>
          {done ? (
            <p className="mt-8 text-sm font-medium text-accent">
              You&apos;re on the early-access list.
            </p>
          ) : (
            <form
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.trim()) return;
                setDone(true);
              }}
            >
              <label className="sr-only" htmlFor="early-access-email">
                Email address
              </label>
              <input
                id="early-access-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="w-full rounded-full border border-border bg-bg/60 px-5 py-3 text-sm text-text outline-none placeholder:text-muted focus:border-accent/50 sm:max-w-sm"
              />
              <button
                type="submit"
                className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Get Early Access
              </button>
            </form>
          )}
          <p className="mt-4 text-xs text-muted">
            No spam. Just new drops worth checking out.
          </p>
        </div>
      </div>
    </section>
  );
}
