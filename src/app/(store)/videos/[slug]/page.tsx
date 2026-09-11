import type { Metadata } from "next";
import { videos } from "@/data/videos";
import { VideoPageClient } from "@/components/products/VideoPageClient";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return videos.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const video = videos.find((v) => v.slug === slug);
  return { title: video?.title ?? "Video" };
}

export default async function VideoPage({ params }: Props) {
  const { slug } = await params;
  return <VideoPageClient slug={slug} />;
}
