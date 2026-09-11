import { HeroSection } from "@/components/home/HeroSection";
import { TrendingStrip } from "@/components/home/TrendingStrip";
import { TrendingSection } from "@/components/home/TrendingSection";
import { AiToolDealsSection } from "@/components/home/AiToolDealsSection";
import { CharactersSection } from "@/components/home/CharactersSection";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { CreatorsNoticedSection } from "@/components/home/CreatorsNoticedSection";
import { FeaturedCollectionSection } from "@/components/home/FeaturedCollectionSection";
import { CollectionValueSection } from "@/components/home/CollectionValueSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { EarlyAccessSection } from "@/components/home/EarlyAccessSection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrendingStrip />
      <TrendingSection />
      <AiToolDealsSection />
      <CharactersSection />
      <CategoriesSection />
      <CreatorsNoticedSection />
      <FeaturedCollectionSection />
      <CollectionValueSection />
      <HowItWorksSection />
      <EarlyAccessSection />
    </>
  );
}
