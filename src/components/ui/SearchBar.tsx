"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchBar({
  value,
  onChange,
  placeholder = "Search dances, characters…",
  className,
}: SearchBarProps) {
  return (
    <div
      className={cn(
        "relative flex items-center rounded-full border border-border bg-surface px-4 py-2.5 transition focus-within:border-accent/50",
        className
      )}
    >
      <Search size={18} className="shrink-0 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search videos"
        className="ml-3 w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="rounded-full p-1 text-muted hover:text-text"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
