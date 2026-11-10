import type { Metadata } from "next";
import { LEGAL_DOCS } from "@/catalog/legalContent";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return <LegalDocumentPage doc={LEGAL_DOCS.privacy} activeId="privacy" />;
}
