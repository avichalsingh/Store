import type { CreatorInsight } from "@/types";
import { Eye, RotateCcw, Share2, MessageCircle, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  eye: Eye,
  replay: RotateCcw,
  share: Share2,
  chat: MessageCircle,
  spark: Sparkles,
  hook: Zap,
} as const;

type CreatorInsightsProps = {
  insights: CreatorInsight[];
  heading?: string;
  className?: string;
};

export function CreatorInsights({
  insights,
  heading = "Why this one gets attention",
  className,
}: CreatorInsightsProps) {
  if (!insights.length) return null;

  return (
    <section className={cn("", className)}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
        Creator insight
      </p>
      <h2 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {heading}
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight) => {
          const Icon = ICONS[insight.icon];
          return (
            <article
              key={insight.title}
              className="rounded-3xl border border-border bg-surface p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Icon size={18} />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-text">
                {insight.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {insight.description}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
