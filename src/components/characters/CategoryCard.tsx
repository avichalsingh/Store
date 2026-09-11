import Link from "next/link";
import type { Category } from "@/types";
import { cn } from "@/lib/utils";
import { CoverImage } from "@/components/ui/CoverImage";

type CategoryCardProps = {
  category: Category;
  className?: string;
};

export function CategoryCard({ category, className }: CategoryCardProps) {
  return (
    <Link
      href={`/explore?category=${encodeURIComponent(category.name)}`}
      aria-label={`Browse ${category.name}`}
      className={cn(
        "group relative block min-h-[180px] overflow-hidden rounded-2xl sm:min-h-[220px]",
        className
      )}
    >
      <div className="absolute inset-0 origin-center transition-transform duration-700 ease-out group-hover:scale-[1.06]">
        <CoverImage
          src={category.image}
          alt=""
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      </div>
      <div className="absolute inset-0 bg-black/55 transition duration-300 group-hover:bg-black/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <h3 className="font-display text-lg font-bold text-white sm:text-xl">
          {category.name}
        </h3>
        <p className="mt-1 text-xs text-white/70">
          {category.videoCount} videos
        </p>
      </div>
    </Link>
  );
}
