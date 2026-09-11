import { Compass, Package, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Compass,
    title: "Discover",
    text: "Find characters and dances you love.",
  },
  {
    icon: Package,
    title: "Choose",
    text: "Buy individual videos or complete packs.",
  },
  {
    icon: Sparkles,
    title: "Create",
    text: "Download and use your content instantly.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="mb-10 max-w-xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Simple flow
        </p>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          How it works
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="rounded-3xl border border-border bg-surface p-7"
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <step.icon size={20} />
              </span>
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                Step {i + 1}
              </span>
            </div>
            <h3 className="font-display text-2xl font-bold text-text">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
