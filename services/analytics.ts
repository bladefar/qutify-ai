import { createClient } from "@/lib/supabase/server";
import { colors } from "@/lib/design-tokens";

export type RevenuePoint = {
  month: string;
  label: string;
  revenue: number;
};

export type LeadFunnelPoint = {
  status: "hot" | "warm" | "cold" | "closed";
  label: string;
  count: number;
  color: string;
};

export type TopProductPoint = {
  productName: string;
  quantity: number;
};

export type AnalyticsOverview = {
  totalRevenue: number;
  conversionRate: number;
  averageQuoteValue: number;
  totalQuotes: number;
  revenue: RevenuePoint[];
  leadFunnel: LeadFunnelPoint[];
  topProducts: TopProductPoint[];
};

const leadStatuses = [
  { status: "hot", label: "Hot", color: colors.success },
  { status: "warm", label: "Warm", color: colors.accent },
  { status: "cold", label: "Cold", color: colors.mutedForeground },
  { status: "closed", label: "Closed", color: colors.primary },
] as const;

function toNumber(value: number | string) {
  return Number(value);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getLastMonths(count: number) {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return {
      key: monthKey(date),
      label: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    };
  });
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const supabase = await createClient();
  const months = getLastMonths(12);
  const firstMonth = new Date();
  firstMonth.setMonth(firstMonth.getMonth() - 11, 1);
  firstMonth.setHours(0, 0, 0, 0);

  const [quotationsResult, customersResult, itemsResult] = await Promise.all([
    supabase
      .from("quotations")
      .select("total, status, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("customers").select("status"),
    supabase.from("quotation_items").select("product_name, quantity"),
  ]);

  if (quotationsResult.error) throw quotationsResult.error;
  if (customersResult.error) throw customersResult.error;
  if (itemsResult.error) throw itemsResult.error;

  const quotations = quotationsResult.data ?? [];
  const customers = customersResult.data ?? [];
  const productQuantities = new Map<string, number>();

  for (const item of itemsResult.data ?? []) {
    productQuantities.set(
      item.product_name,
      (productQuantities.get(item.product_name) ?? 0) + toNumber(item.quantity)
    );
  }
  const acceptedQuotes = quotations.filter((quotation) => quotation.status === "accepted");
  const totalRevenue = acceptedQuotes.reduce(
    (sum, quotation) => sum + toNumber(quotation.total),
    0
  );
  const totalQuotes = quotations.length;
  const revenueByMonth = new Map(months.map(({ key }) => [key, 0]));

  for (const quotation of acceptedQuotes) {
    const date = new Date(quotation.created_at);
    if (date < firstMonth) continue;
    const key = monthKey(date);
    if (revenueByMonth.has(key)) {
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + toNumber(quotation.total));
    }
  }

  return {
    totalRevenue,
    conversionRate: totalQuotes === 0 ? 0 : (acceptedQuotes.length / totalQuotes) * 100,
    averageQuoteValue: totalQuotes === 0
      ? 0
      : quotations.reduce((sum, quotation) => sum + toNumber(quotation.total), 0) / totalQuotes,
    totalQuotes,
    revenue: months.map(({ key, label }) => ({
      month: key,
      label,
      revenue: revenueByMonth.get(key) ?? 0,
    })),
    leadFunnel: leadStatuses.map(({ status, label, color }) => ({
      status,
      label,
      color,
      count: customers.filter((customer) => customer.status === status).length,
    })),
    topProducts: Array.from(productQuantities.entries())
      .sort(([, quantityA], [, quantityB]) => quantityB - quantityA)
      .slice(0, 10)
      .map(([productName, quantity]) => ({ productName, quantity })),
  };
}
