"use client";

import { AreaChart } from "@/admin/components/charts/Charts";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminStatCard } from "@/admin/components/ui/AdminStatCard";
import { AdminTabs } from "@/admin/components/ui/AdminTabs";
import { StatusBadge } from "@/admin/components/ui/AdminBadge";
import { formatDateTime, formatInr, formatUsd, greeting } from "@/admin/lib/format";
import { useAdmin } from "@/admin/store/AdminProvider";
import {
  Clapperboard,
  IndianRupee,
  Package,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAdminSession } from "@/admin/lib/auth";

type Range = "7D" | "30D" | "90D" | "12M";

export default function AdminDashboardPage() {
  const { products, orders, analytics, hydrated } = useAdmin();
  const [range, setRange] = useState<Range>("30D");
  const [adminName, setAdminName] = useState("Admin");
  const snap = analytics[range];

  useEffect(() => {
    const session = getAdminSession();
    if (session?.name) setAdminName(session.name);
  }, []);

  const topFormats = useMemo(
    () =>
      [...products]
        .filter((p) => p.status === "active")
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 4),
    [products],
  );

  const recent = useMemo(
    () => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [orders],
  );

  if (!hydrated) {
    return <p className="text-sm text-[var(--admin-muted)]">Loading dashboard…</p>;
  }

  return (
    <div>
      <AdminPageHeader
        title={`${greeting()}, ${adminName}`}
        description="Here's what's happening with RHYTHM."
        actions={
          <>
            <Link href="/admin/products/new">
              <AdminButton variant="primary">+ Add New Product</AdminButton>
            </Link>
            <Link href="/admin/campaigns">
              <AdminButton variant="secondary">⚡ Create Campaign</AdminButton>
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Revenue"
          value={formatInr(snap.revenue)}
          change={snap.revenueChange}
          hint="vs prior period"
          icon={IndianRupee}
        />
        <AdminStatCard
          label="Orders"
          value={snap.orders}
          change={snap.ordersChange}
          hint="completed + pending"
          icon={ShoppingBag}
        />
        <AdminStatCard
          label="Products sold"
          value={snap.productsSold}
          change={snap.productsSoldChange}
          icon={Package}
        />
        <AdminStatCard
          label="Avg order"
          value={formatInr(snap.averageOrder)}
          change={snap.averageOrderChange}
          icon={TrendingUp}
        />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <AdminCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-syne)] text-base font-semibold">
                Revenue
              </h2>
              <p className="text-xs text-[var(--admin-muted)]">INR · mock analytics</p>
            </div>
            <AdminTabs
              tabs={[
                { id: "7D", label: "7D" },
                { id: "30D", label: "30D" },
                { id: "90D", label: "90D" },
                { id: "12M", label: "12M" },
              ]}
              value={range}
              onChange={setRange}
            />
          </div>
          <AreaChart data={snap.series} />
        </AdminCard>

        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-base font-semibold">
            Top performing formats
          </h2>
          <ul className="space-y-3">
            {topFormats.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-[var(--admin-surface-2)]"
                >
                  <div className="relative h-11 w-9 overflow-hidden rounded-lg bg-[var(--admin-surface-2)]">
                    <Image src={p.media.thumbnail} alt="" fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-[var(--admin-muted)]">
                      {p.performance.plays} plays · {p.performance.badge}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <AdminCard padding={false}>
          <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-5 py-4">
            <h2 className="font-[family-name:var(--font-syne)] text-base font-semibold">
              Recent orders
            </h2>
            <Link href="/admin/orders" className="text-xs text-[var(--admin-accent)]">
              View all
            </Link>
          </div>
          <ul>
            {recent.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{o.customerName}</p>
                  <p className="text-xs text-[var(--admin-muted)]">
                    {o.id} · {formatDateTime(o.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {o.currency === "INR" ? formatInr(o.amount) : formatUsd(o.amount)}
                  </p>
                  <StatusBadge status={o.paymentStatus} />
                </div>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard>
          <h2 className="mb-3 font-[family-name:var(--font-syne)] text-base font-semibold">
            Quick actions
          </h2>
          <div className="grid gap-2">
            <Link href="/admin/products/new">
              <AdminButton variant="secondary" className="w-full justify-start">
                <Clapperboard className="h-4 w-4" /> + Add New Product
              </AdminButton>
            </Link>
            <Link href="/admin/characters">
              <AdminButton variant="secondary" className="w-full justify-start">
                + Add Character
              </AdminButton>
            </Link>
            <Link href="/admin/collections">
              <AdminButton variant="secondary" className="w-full justify-start">
                + Create Collection
              </AdminButton>
            </Link>
            <Link href="/admin/campaigns">
              <AdminButton variant="secondary" className="w-full justify-start">
                ⚡ Create Campaign
              </AdminButton>
            </Link>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
