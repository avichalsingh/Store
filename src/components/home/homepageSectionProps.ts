import type {
  HomepageHeroConfig,
  HomepageSectionContent,
  HomepageSectionCopy,
} from "@/admin/types";

export type HomepageSectionViewProps = {
  copy?: HomepageSectionCopy;
  content?: HomepageSectionContent;
};

export type HomepageHeroViewProps = {
  hero: HomepageHeroConfig;
};
