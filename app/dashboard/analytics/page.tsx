import { FileText, IndianRupee, Percent, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UpgradeNotice } from "@/components/billing/upgrade-notice";
import { LeadFunnelChart } from "@/features/analytics/components/lead-funnel-chart";
import { RevenueChart } from "@/features/analytics/components/revenue-chart";
import { TopProductsTable } from "@/features/analytics/components/top-products-table";
import { getAnalyticsOverview } from "@/services/analytics";
import { getEffectiveEntitlements } from "@/services/entitlements";

export const dynamic = "force-dynamic";

const statCards = [
  { key: "totalRevenue", label: "Total Revenue", icon: IndianRupee, iconClass: "bg-brand-success/10 text-brand-success" },
  { key: "conversionRate", label: "Conversion Rate", icon: Percent, iconClass: "bg-primary/10 text-primary" },
  { key: "averageQuoteValue", label: "Average Quote Value", icon: TrendingUp, iconClass: "bg-brand-accent/10 text-brand-accent" },
  { key: "totalQuotes", label: "Total Quotes", icon: FileText, iconClass: "bg-destructive/10 text-destructive" },
] as const;

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default async function AnalyticsPage() {
  const entitlements = await getEffectiveEntitlements();

  if (!entitlements.features.analytics) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Revenue, conversion, funnel, and product performance insights.
          </p>
        </div>
        <UpgradeNotice
          title="Analytics is included with Pro"
          description="Upgrade to Pro to view revenue trends, conversion rates, lead funnel data, and top products."
        />
      </div>
    );
  }

  const analytics = await getAnalyticsOverview();
  const values = {
    totalRevenue: formatCurrency(analytics.totalRevenue),
    conversionRate: `${analytics.conversionRate.toFixed(1)}%`,
    averageQuoteValue: formatCurrency(analytics.averageQuoteValue),
    totalQuotes: analytics.totalQuotes,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Understand your revenue, conversion, and quote activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.key} className="glass py-4">
            <CardContent className="flex items-center gap-4 px-4">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${stat.iconClass}`}>
                <stat.icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums tracking-tight">{values[stat.key]}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <RevenueChart data={analytics.revenue} />

      <LeadFunnelChart data={analytics.leadFunnel} />

      <TopProductsTable data={analytics.topProducts} hasQuotes={analytics.totalQuotes > 0} />
    </div>
  );
}
