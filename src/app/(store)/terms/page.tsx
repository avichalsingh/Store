import type { Metadata } from "next";
import { LEGAL_DOCS } from "@/catalog/legalContent";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Terms & Conditions",
};

export default function TermsPage() {
  return <LegalDocumentPage doc={LEGAL_DOCS.terms} activeId="terms" />;
}
