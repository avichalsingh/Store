import type { Metadata } from "next";
import { LEGAL_DOCS } from "@/catalog/legalContent";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Contact & Support",
};

export default function ContactPage() {
  return <LegalDocumentPage doc={LEGAL_DOCS.contact} activeId="contact" />;
}
