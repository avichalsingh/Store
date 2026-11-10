import type { Metadata } from "next";
import { LEGAL_DOCS } from "@/catalog/legalContent";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Digital Product Delivery",
};

export default function DeliveryPage() {
  return <LegalDocumentPage doc={LEGAL_DOCS.delivery} activeId="delivery" />;
}
