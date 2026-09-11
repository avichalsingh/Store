"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminEmptyState } from "@/admin/components/ui/AdminEmptyState";
import { AdminModal } from "@/admin/components/ui/AdminModal";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminSearchInput } from "@/admin/components/ui/AdminSearchInput";
import { AdminTable, type AdminColumn } from "@/admin/components/ui/AdminTable";
import { formatDate, formatInr, formatUsd } from "@/admin/lib/format";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminCustomer } from "@/admin/types";
import { UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

export default function CustomersPage() {
  const { customers, orders, hydrated } = useAdmin();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AdminCustomer | null>(null);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s) ||
        c.country.toLowerCase().includes(s),
    );
  }, [customers, q]);

  const columns: AdminColumn<AdminCustomer>[] = [
    {
      key: "name",
      header: "Customer",
      render: (c) => (
        <div>
          <p className="font-medium">{c.name}</p>
          <p className="text-xs text-[var(--admin-muted)]">{c.email}</p>
        </div>
      ),
    },
    { key: "country", header: "Country", render: (c) => c.country },
    { key: "orders", header: "Orders", render: (c) => c.orders },
    {
      key: "spent",
      header: "Spent",
      render: (c) =>
        c.currency === "INR" ? formatInr(c.totalSpent) : formatUsd(c.totalSpent),
    },
    {
      key: "last",
      header: "Last purchase",
      render: (c) => (
        <span className="text-[var(--admin-muted)]">
          {c.lastPurchase ? formatDate(c.lastPurchase) : "—"}
        </span>
      ),
    },
  ];

  const customerOrders = selected
    ? orders.filter((o) => o.customerId === selected.id)
    : [];

  if (!hydrated) return null;

  return (
    <div>
      <AdminPageHeader
        title="Customers"
        description="Creators and studios who license RHYTHM formats."
      />
      <AdminSearchInput
        className="mb-4 max-w-sm"
        placeholder="Search customers…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <AdminTable
        columns={columns}
        rows={rows}
        onRowClick={setSelected}
        empty={
          <AdminEmptyState
            icon={UsersRound}
            title="No customers"
            description="Customer profiles will show here."
          />
        }
      />

      <AdminModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? "Customer"}
        wide
        footer={
          <AdminButton variant="secondary" onClick={() => setSelected(null)}>
            Close
          </AdminButton>
        }
      >
        {selected ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <span className="text-[var(--admin-muted)]">Email</span>
                <br />
                {selected.email}
              </p>
              <p>
                <span className="text-[var(--admin-muted)]">Country</span>
                <br />
                {selected.country}
              </p>
              <p>
                <span className="text-[var(--admin-muted)]">Total spent</span>
                <br />
                {selected.currency === "INR"
                  ? formatInr(selected.totalSpent)
                  : formatUsd(selected.totalSpent)}
              </p>
              <p>
                <span className="text-[var(--admin-muted)]">Joined</span>
                <br />
                {formatDate(selected.createdAt)}
              </p>
            </div>
            <div>
              <p className="mb-2 font-medium">Orders</p>
              {customerOrders.length === 0 ? (
                <p className="text-[var(--admin-muted)]">No orders yet.</p>
              ) : (
                <ul className="space-y-2">
                  {customerOrders.map((o) => (
                    <li
                      key={o.id}
                      className="flex justify-between rounded-xl border border-[var(--admin-border)] px-3 py-2"
                    >
                      <span>{o.id}</span>
                      <span>
                        {o.currency === "INR"
                          ? formatInr(o.amount)
                          : formatUsd(o.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
