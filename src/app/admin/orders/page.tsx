"use client";

import { StatusBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminEmptyState } from "@/admin/components/ui/AdminEmptyState";
import { AdminModal } from "@/admin/components/ui/AdminModal";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminSearchInput } from "@/admin/components/ui/AdminSearchInput";
import { AdminTable, type AdminColumn } from "@/admin/components/ui/AdminTable";
import { formatDateTime, formatInr, formatUsd } from "@/admin/lib/format";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminOrder } from "@/admin/types";
import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

export default function OrdersPage() {
  const { orders, hydrated } = useAdmin();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(s) ||
        o.customerName.toLowerCase().includes(s) ||
        o.customerEmail.toLowerCase().includes(s),
    );
  }, [orders, q]);

  const columns: AdminColumn<AdminOrder>[] = [
    {
      key: "id",
      header: "Order",
      render: (o) => <span className="font-medium">{o.id}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (o) => (
        <div>
          <p>{o.customerName}</p>
          <p className="text-xs text-[var(--admin-muted)]">{o.customerEmail}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (o) =>
        o.currency === "INR" ? formatInr(o.amount) : formatUsd(o.amount),
    },
    {
      key: "payment",
      header: "Payment",
      render: (o) => <StatusBadge status={o.paymentStatus} />,
    },
    {
      key: "status",
      header: "Fulfillment",
      render: (o) => <StatusBadge status={o.orderStatus} />,
    },
    {
      key: "date",
      header: "Date",
      render: (o) => (
        <span className="text-[var(--admin-muted)]">{formatDateTime(o.createdAt)}</span>
      ),
    },
  ];

  if (!hydrated) return null;

  return (
    <div>
      <AdminPageHeader
        title="Orders"
        description="Mock purchase history across INR and USD markets."
      />
      <AdminSearchInput
        className="mb-4 max-w-sm"
        placeholder="Search orders…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <AdminTable
        columns={columns}
        rows={rows}
        onRowClick={setSelected}
        empty={
          <AdminEmptyState
            icon={ShoppingBag}
            title="No orders"
            description="Orders will appear here once purchases come in."
          />
        }
      />

      <AdminModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Order ${selected.id}` : "Order"}
        wide
        footer={
          <AdminButton variant="secondary" onClick={() => setSelected(null)}>
            Close
          </AdminButton>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-[var(--admin-muted)]">Customer</span>
                <br />
                {selected.customerName}
              </p>
              <p>
                <span className="text-[var(--admin-muted)]">Email</span>
                <br />
                {selected.customerEmail}
              </p>
              <p>
                <span className="text-[var(--admin-muted)]">Payment</span>
                <br />
                <StatusBadge status={selected.paymentStatus} />
              </p>
              <p>
                <span className="text-[var(--admin-muted)]">Fulfillment</span>
                <br />
                <StatusBadge status={selected.orderStatus} />
              </p>
            </div>
            <ul className="space-y-2">
              {selected.items.map((item, i) => (
                <li
                  key={`${item.productId}-${i}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] p-2"
                >
                  <div className="relative h-12 w-10 overflow-hidden rounded-lg bg-[var(--admin-surface-2)]">
                    <Image src={item.thumbnail} alt="" fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                  </div>
                  <p className="text-sm">
                    {item.currency === "INR"
                      ? formatInr(item.price)
                      : formatUsd(item.price)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-right text-sm font-semibold">
              Total{" "}
              {selected.currency === "INR"
                ? formatInr(selected.amount)
                : formatUsd(selected.amount)}
            </p>
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
