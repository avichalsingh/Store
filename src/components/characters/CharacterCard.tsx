import Link from "next/link";
import type { Character } from "@/types";
import { cn } from "@/lib/utils";
import { CoverImage } from "@/components/ui/CoverImage";

type CharacterCardProps = {
  character: Character;
  className?: string;
  featured?: boolean;
};

export function CharacterCard({
  character,
  className,
  featured = false,
}: CharacterCardProps) {
  return (
    <Link
      href={`/characters/${character.slug}`}
      aria-label={`Open ${character.name}'s world`}
      className={cn(
        "group relative block overflow-hidden rounded-3xl bg-surface transition duration-500",
        featured ? "min-h-[420px]" : "min-h-[360px]",
        className
      )}
      style={
        {
          "--char-accent": character.accentColor,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 origin-center transition-transform duration-700 ease-out group-hover:scale-[1.06]">
          <CoverImage
            src={character.image}
            alt=""
            fill
            sizes="(max-width: 768px) 80vw, 25vw"
          />
        </div>
        <div
          className="absolute inset-0 opacity-70 transition group-hover:opacity-80"
          style={{
            background: `linear-gradient(to top, ${character.accentColor}cc 0%, transparent 55%), linear-gradient(to top, #0c0c0e 0%, transparent 45%)`,
          }}
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6">
        <div
          className="mb-3 h-1 w-10 rounded-full"
          style={{ background: character.accentColor }}
        />
        <h3 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {character.name}
        </h3>
        <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-white/85">
          {character.shortDescription}
        </p>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-white/70">
          {character.videoCount} videos
        </p>
      </div>
    </Link>
  );
}
