import { creatorTestimonials } from "@/data/conversion";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { cn } from "@/lib/utils";

export function CreatorsNoticedSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <SectionHeader
        eyebrow="Social proof"
        title="Creators noticed."
        description="Sample reactions from creators exploring these formats. Replace with verified testimonials when available."
      />
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 hide-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {creatorTestimonials.map((item) => (
          <article
            key={item.id}
            className={cn(
              "flex w-[280px] shrink-0 flex-col justify-between rounded-3xl border border-border p-5 sm:w-auto",
              item.variant === "quote" && "bg-surface",
              item.variant === "social" && "bg-surface-2",
              item.variant === "profile" &&
                "bg-gradient-to-br from-surface via-surface to-accent/10"
            )}
          >
            {item.variant === "social" && (
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Creator note
              </p>
            )}
            <p
              className={cn(
                "text-sm leading-relaxed text-text",
                item.variant === "quote" && "font-display text-lg font-semibold"
              )}
            >
              “{item.quote}”
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: item.accent ?? "#FF5C8A" }}
              >
                {item.handle.replace("@", "").slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-semibold text-text">{item.handle}</p>
                <p className="text-xs text-muted">{item.role}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">
        Demo / sample creator feedback for design purposes.
      </p>
    </section>
  );
}
