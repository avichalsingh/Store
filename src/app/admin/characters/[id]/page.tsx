"use client";

import { CharacterEditor } from "@/admin/components/characters/CharacterEditor";
import { use } from "react";

export default function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CharacterEditor characterId={id} />;
}
