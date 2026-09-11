"use client";

import { AreaChart, BarChart } from "@/admin/components/charts/Charts";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminStatCard } from "@/admin/components/ui/AdminStatCard";
import { AdminTabs } from "@/admin/components/ui/AdminTabs";
import { formatInr } from "@/admin/lib/format";
import { useAdmin } from "@/admin/store/AdminProvider";
import { IndianRupee, Package, ShoppingBag, TrendingUp } from "lucide-react";
import { useState } from "react";

type Range = "7D" | "30D" | "90D" | "12M";

export default function AnalyticsPage() {
  const { analytics, hydrated } = useAdmin();
  const [range, setRange] = useState<Range>("30D");
  const snap = analytics[range];

  if (!hydrated) return null;

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        description="Mock revenue and product performance snapshots."
        actions={
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
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Revenue"
          value={formatInr(snap.revenue)}
          change={snap.revenueChange}
          icon={IndianRupee}
        />
        <AdminStatCard
          label="Orders"
          value={snap.orders}
          change={snap.ordersChange}
          icon={ShoppingBag}
        />
        <AdminStatCard
          label="Products sold"
          value={snap.productsSold}
          change={snap.productsSoldChange}
          icon={Package}
        />
        <AdminStatCard
          label="Average order"
          value={formatInr(snap.averageOrder)}
          change={snap.averageOrderChange}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-base font-semibold">
            Revenue over time
          </h2>
          <AreaChart data={snap.series} />
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-base font-semibold">
            Top products
          </h2>
          <BarChart
            items={snap.topProducts.map((p) => ({
              label: p.name,
              value: p.revenue,
            }))}
          />
        </AdminCard>
      </div>
    </div>
  );
}
