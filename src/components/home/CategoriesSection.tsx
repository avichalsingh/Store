import { SectionHeader } from "@/components/ui/SectionHeader";
import { CategoryCard } from "@/components/characters/CategoryCard";
import { categories } from "@/data/collections";

export function CategoriesSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <SectionHeader
        eyebrow="Mood first"
        title="Browse by Vibe"
        description="Jump straight into the energy you're looking for."
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
