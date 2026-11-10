import type { Metadata } from "next";
import { AboutPageClient } from "@/components/about/AboutPageClient";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return <AboutPageClient />;
}
