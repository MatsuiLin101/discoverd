"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/lib/ga";

// GA's `date` dimension is "YYYYMMDD" → "M/D".
const fmtDate = (d: string) => (d.length === 8 ? `${Number(d.slice(4, 6))}/${Number(d.slice(6, 8))}` : d);

// Client-side daily bar chart (Recharts) with axes and an interactive tooltip.
// Data is prepared server-side and passed in as plain points.
export default function TrendChart({ points, unit }: { points: TrendPoint[]; unit: string }) {
  const data = points.map((p) => ({ date: fmtDate(p.date), value: p.value }));
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          interval="preserveStartEnd"
          minTickGap={24}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          width={30}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(v): [string, string] => [`${Number(v).toLocaleString("zh-TW")} ${unit}`, ""]}
          separator=""
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", padding: "4px 8px" }}
          cursor={{ fill: "rgba(99,102,241,0.08)" }}
        />
        <Bar dataKey="value" fill="#818cf8" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
