"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { colors } from "@/lib/design-tokens";
import type { LeadFunnelPoint } from "@/services/analytics";

export function LeadFunnelChart({ data }: { data: LeadFunnelPoint[] }) {
  const customerCount = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Lead funnel</CardTitle>
        <CardDescription>Customers grouped by their current lead status.</CardDescription>
      </CardHeader>
      <CardContent className="h-80 px-2 pb-4 sm:px-6">
        {customerCount === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="font-medium">No customers yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a customer to start tracking your lead funnel.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={colors.border} strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.mutedForeground, fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.mutedForeground, fontSize: 12 }}
                width={28}
              />
              <Tooltip
                cursor={{ fill: colors.border, fillOpacity: 0.35 }}
                contentStyle={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                }}
                formatter={(value) => [value, "Customers"]}
              />
              <Bar dataKey="count" name="Customers" radius={[6, 6, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
