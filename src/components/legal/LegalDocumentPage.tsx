import Link from "next/link";
import {
  LEGAL_CONFIRMED_FACTS_SUMMARY,
  LEGAL_MISSING_BUSINESS_DETAILS,
  LEGAL_NAV,
  type LegalDoc,
  type LegalDocId,
} from "@/catalog/legalContent";

export function LegalDocumentPage({
  doc,
  activeId,
}: {
  doc: LegalDoc;
  activeId: LegalDocId;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {doc.eyebrow}
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
        {doc.title}
      </h1>
      <p className="mt-3 text-sm text-muted">{doc.lastUpdatedLabel}</p>
      <div
        role="status"
        className="mt-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-muted"
      >
        <p className="font-semibold text-text">
          Draft disclosures — not production-final
        </p>
        <p className="mt-1">
          Confirmed facts only: {LEGAL_CONFIRMED_FACTS_SUMMARY} Bracketed fields
          below are unresolved blockers and are not confirmed business details.
          Missing facts are not filled with guesses.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {LEGAL_MISSING_BUSINESS_DETAILS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <p className="mt-5 text-base leading-relaxed text-muted">{doc.summary}</p>

      <nav
        aria-label="Legal documents"
        className="mt-8 flex flex-wrap gap-2 border-y border-border py-4"
      >
        {LEGAL_NAV.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={
              item.id === activeId
                ? "rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white"
                : "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:text-text"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-text-dim">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-2xl font-bold text-text">
              {section.heading}
            </h2>
            <p className="mt-3 whitespace-pre-wrap">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-12 rounded-2xl border border-border bg-surface-2/50 px-4 py-3 text-xs text-muted">
        Draft only. Confirm business details and obtain appropriate legal review
        before relying on this page in production.
      </p>
    </div>
  );
}
