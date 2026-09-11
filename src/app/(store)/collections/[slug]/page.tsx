import type { Metadata } from "next";
import { collections } from "@/data/collections";
import { CollectionPageClient } from "@/components/collections/CollectionPageClient";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = collections.find((c) => c.slug === slug);
  return { title: collection?.title ?? "Collection" };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  return <CollectionPageClient slug={slug} />;
}
