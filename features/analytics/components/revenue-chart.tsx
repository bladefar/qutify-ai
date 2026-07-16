"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { colors } from "@/lib/design-tokens";
import type { RevenuePoint } from "@/services/analytics";

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Revenue over time</CardTitle>
        <CardDescription>Accepted quotes, shown for the last 12 months.</CardDescription>
      </CardHeader>
      <CardContent className="h-80 px-2 pb-4 sm:px-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={colors.border} strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: colors.mutedForeground, fontSize: 12 }}
              minTickGap={24}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: colors.mutedForeground, fontSize: 12 }}
              tickFormatter={(value: number) => `₹${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`}
              width={48}
            />
            <Tooltip
              cursor={{ stroke: colors.border }}
              contentStyle={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
              }}
              formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={colors.primary}
              strokeWidth={3}
              dot={{ fill: colors.primary, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
