"use client";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { CharacterCard } from "@/components/characters/CharacterCard";
import { useCatalog } from "@/catalog/useCatalog";

export function CharactersSection() {
  const { characters } = useCatalog();

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <SectionHeader
        eyebrow="The cast"
        title="Meet the Characters"
        description="Each character has a voice, a vibe, and a growing library of moves."
        href="/characters"
        linkLabel="All characters"
      />
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 pt-2 hide-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {characters.map((character, i) => (
          <CharacterCard
            key={character.id}
            character={character}
            featured={i === 0}
            className="w-[280px] shrink-0 sm:w-auto"
          />
        ))}
      </div>
    </section>
  );
}
