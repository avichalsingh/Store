"use client";

import { motion } from "framer-motion";
import { VideoPreview } from "@/components/products/VideoPreview";
import { PerformanceCardOverlay } from "@/components/products/PerformanceCardOverlay";
import type { VideoProduct } from "@/types";
import { usePrefersReducedMotion } from "@/hooks/useInViewOnce";

export function ProductHeroMedia({ video }: { video: VideoProduct }) {
  const reduced = usePrefersReducedMotion();
  const hasPreview = Boolean(video.previewVideo);

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative max-h-full overflow-hidden rounded-[1.75rem] ring-1 ring-border"
    >
      <VideoPreview
        thumbnail={video.thumbnail}
        title={video.title}
        previewVideo={video.previewVideo}
        priority
        autoPlayOnHover={false}
        idlePlayPulse={hasPreview}
        className="max-h-full"
      />
      {video.performance ? (
        <PerformanceCardOverlay performance={video.performance} />
      ) : null}
    </motion.div>
  );
}
