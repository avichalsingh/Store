import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        About
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
        Motion for modern creators
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-muted">
        RHYTHM is a digital store for AI-generated character dance videos.
        Browse a growing cast, preview vertical routines, and buy individual
        moves or curated packs — ready for social, edits, and creative projects.
      </p>

      <div className="mt-12 space-y-10 text-sm leading-relaxed text-text-dim">
        <section id="faq">
          <h2 className="font-display text-2xl font-bold text-text">FAQ</h2>
          <p className="mt-3">
            After purchase, videos appear in your library for instant download.
            Real authentication and delivery will plug into this flow.
          </p>
        </section>
        <section id="licenses">
          <h2 className="font-display text-2xl font-bold text-text">
            Licenses
          </h2>
          <p className="mt-3">
            Standard licenses cover personal and social use. Commercial options
            will be available at checkout once payments go live.
          </p>
        </section>
        <section id="terms">
          <h2 className="font-display text-2xl font-bold text-text">Terms</h2>
          <p className="mt-3">
            Placeholder terms of service. Replace with your legal copy before
            launch.
          </p>
        </section>
        <section id="privacy">
          <h2 className="font-display text-2xl font-bold text-text">Privacy</h2>
          <p className="mt-3">
            Placeholder privacy policy. Replace with your privacy practices
            before launch.
          </p>
        </section>
      </div>
    </div>
  );
}
