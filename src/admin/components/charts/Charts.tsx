"use client";

import type { AnalyticsPoint } from "@/admin/types";
import { useMemo } from "react";

export function AreaChart({
  data,
  height = 220,
  valueKey = "revenue",
}: {
  data: AnalyticsPoint[];
  height?: number;
  valueKey?: "revenue" | "orders";
}) {
  const width = 640;
  const pad = { t: 16, r: 12, b: 28, l: 12 };

  const { path, area, points, max } = useMemo(() => {
    const values = data.map((d) => d[valueKey]);
    const maxVal = Math.max(...values, 1);
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const coords = data.map((d, i) => {
      const x = pad.l + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
      const y = pad.t + innerH - (d[valueKey] / maxVal) * innerH;
      return { x, y, label: d.label, value: d[valueKey] };
    });
    const line = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(" ");
    const areaPath = coords.length
      ? `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${(height - pad.b).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(height - pad.b).toFixed(1)} Z`
      : "";
    return { path: line, area: areaPath, points: coords, max: maxVal };
  }, [data, height, valueKey]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
      <defs>
        <linearGradient id="adminAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e23d73" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#e23d73" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad.t + (height - pad.t - pad.b) * (1 - t);
        return (
          <line
            key={t}
            x1={pad.l}
            x2={width - pad.r}
            y1={y}
            y2={y}
            stroke="var(--admin-border)"
            strokeDasharray="4 4"
          />
        );
      })}
      <path d={area} fill="url(#adminAreaFill)" />
      <path d={path} fill="none" stroke="#e23d73" strokeWidth="2.25" strokeLinecap="round" />
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#e23d73" strokeWidth="2" />
          <text
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            className="fill-[var(--admin-muted)]"
            fontSize="10"
          >
            {p.label}
          </text>
        </g>
      ))}
      <title>
        Max {max.toLocaleString()} {valueKey}
      </title>
    </svg>
  );
}

export function BarChart({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-[var(--admin-text)]">{item.label}</span>
            <span className="text-[var(--admin-muted)]">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-surface-2)]">
            <div
              className="h-full rounded-full bg-[var(--admin-accent)]"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
