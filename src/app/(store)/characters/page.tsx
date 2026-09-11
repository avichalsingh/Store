"use client";

import { CharacterCard } from "@/components/characters/CharacterCard";
import { useCatalog } from "@/catalog/useCatalog";

export default function CharactersPage() {
  const { characters } = useCatalog();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="mb-12 max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Universe
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Meet the characters
        </h1>
        <p className="mt-3 text-muted">
          Every character has a personality, a color story, and a growing set of
          dances.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => (
          <CharacterCard key={character.id} character={character} />
        ))}
      </div>
    </div>
  );
}
