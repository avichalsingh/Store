import type { Metadata } from "next";
import { AdminShell } from "@/admin/components/layout/AdminShell";
import { AuthGate } from "@/admin/components/layout/AuthGate";

export const metadata: Metadata = {
  title: {
    default: "PRAGVI Admin",
    template: "%s · PRAGVI Admin",
  },
  description: "PRAGVI content and store operations CMS",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-root">
      <AuthGate>
        <AdminShell>{children}</AdminShell>
      </AuthGate>
    </div>
  );
}
