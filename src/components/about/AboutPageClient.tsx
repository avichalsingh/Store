"use client";

import { useSiteContent } from "@/catalog/useSiteContent";
import { DEFAULT_SITE_ABOUT } from "@/catalog/siteContent";

/** Plain-text paragraphs only — no HTML rendering. */
function PlainParagraphs({ text }: { text: string }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length === 0) return null;
  return (
    <>
      {blocks.map((block, i) => (
        <p key={i} className="mt-3 whitespace-pre-wrap">
          {block}
        </p>
      ))}
    </>
  );
}

export function AboutPageClient() {
  const { about } = useSiteContent();
  const content = about ?? DEFAULT_SITE_ABOUT;
  const faqItems = [...content.faqItems]
    .filter((f) => f.enabled && (f.question.trim() || f.answer.trim()))
    .sort((a, b) => a.order - b.order);
  const sections = [...content.sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {content.eyebrow}
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
        {content.title}
      </h1>
      {content.intro.trim() ? (
        <p className="mt-5 text-lg leading-relaxed text-muted whitespace-pre-wrap">
          {content.intro}
        </p>
      ) : null}

      <div className="mt-12 space-y-10 text-sm leading-relaxed text-text-dim">
        {sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 className="font-display text-2xl font-bold text-text">
              {section.heading}
            </h2>
            {section.id === "faq" ? (
              faqItems.length > 0 ? (
                <div className="mt-3 space-y-6">
                  {faqItems.map((item) => (
                    <div key={item.id}>
                      {item.question.trim() ? (
                        <h3 className="font-semibold text-text">
                          {item.question}
                        </h3>
                      ) : null}
                      {item.answer.trim() ? (
                        <PlainParagraphs text={item.answer} />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : section.body.trim() ? (
                <PlainParagraphs text={section.body} />
              ) : null
            ) : section.body.trim() ? (
              <PlainParagraphs text={section.body} />
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
