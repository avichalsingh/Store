import type { Metadata } from "next";
import { characters } from "@/data/characters";
import { CharacterPageClient } from "@/components/characters/CharacterPageClient";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return characters.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const character = characters.find((c) => c.slug === slug);
  return { title: character?.name ?? "Character" };
}

export default async function CharacterPage({ params }: Props) {
  const { slug } = await params;
  return <CharacterPageClient slug={slug} />;
}
