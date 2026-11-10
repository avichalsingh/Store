import type { Metadata } from "next";
import { LEGAL_DOCS } from "@/catalog/legalContent";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Refunds & Cancellation",
};

export default function RefundsPage() {
  return <LegalDocumentPage doc={LEGAL_DOCS.refunds} activeId="refunds" />;
}
