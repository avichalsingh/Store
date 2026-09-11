import { redirect } from "next/navigation";
import { LEGACY_HASHTAG_SLUG_TO_CAPTION_SLUG } from "@/catalog/contentPackMigration";

export default async function HashtagProductRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const target = LEGACY_HASHTAG_SLUG_TO_CAPTION_SLUG[slug] ?? slug;
  redirect(`/captions/${target}`);
}
