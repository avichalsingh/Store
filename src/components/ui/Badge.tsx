import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "accent" | "neutral" | "soft";
  className?: string;
};

export function Badge({ children, tone = "accent", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        tone === "accent" && "bg-accent/90 text-white",
        tone === "neutral" && "bg-white/10 text-text backdrop-blur-sm",
        tone === "soft" && "bg-accent-soft text-accent",
        className
      )}
    >
      {children}
    </span>
  );
}
