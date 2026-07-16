import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  UsageConsumption,
  UsageMetric,
  UsageRecord,
  UsageSnapshot,
} from "@/types/billing";

type UsageRow = Pick<UsageRecord, "metric" | "period" | "quantity">;

type UsageConsumptionRow = {
  allowed: boolean;
  plan_code: string;
  monthly_limit: number;
  monthly_used: number;
  monthly_remaining: number;
  monthly_reset_at: string;
  hourly_limit: number | null;
  hourly_used: number | null;
  hourly_remaining: number | null;
  hourly_reset_at: string | null;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function getCurrentUsage(): Promise<UsageSnapshot> {
  const { supabase, user } = await requireUser();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("usage_tracking")
    .select("metric, period, quantity")
    .eq("user_id", user.id)
    .lte("period_start", now)
    .gt("period_end", now);

  if (error) throw error;

  const rows = (data ?? []) as UsageRow[];
  const quantityFor = (metric: UsageMetric, period: "hour" | "month") =>
    Number(
      rows.find((row) => row.metric === metric && row.period === period)
        ?.quantity ?? 0
    );

  return {
    quotationsThisMonth: quantityFor("quotations", "month"),
    aiGenerationsThisMonth: quantityFor("ai_generations", "month"),
    aiGenerationsThisHour: quantityFor("ai_generations", "hour"),
  };
}

/**
 * Atomically reserves one unit against DB-resolved plan limits. This service is
 * intentionally not wired into any product flow yet; Part 2 will decide where
 * a successful reservation belongs in each create/generate transaction.
 */
export async function consumeTrackedUsage(
  metric: UsageMetric
): Promise<UsageConsumption> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("consume_entitlement_usage", {
    p_metric: metric,
  });

  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as
    | UsageConsumptionRow
    | null;
  if (!row) throw new Error("Usage could not be recorded");

  return {
    allowed: row.allowed,
    planCode: row.plan_code,
    monthlyLimit: Number(row.monthly_limit),
    monthlyUsed: Number(row.monthly_used),
    monthlyRemaining: Number(row.monthly_remaining),
    monthlyResetAt: row.monthly_reset_at,
    hourlyLimit: row.hourly_limit === null ? null : Number(row.hourly_limit),
    hourlyUsed: row.hourly_used === null ? null : Number(row.hourly_used),
    hourlyRemaining:
      row.hourly_remaining === null ? null : Number(row.hourly_remaining),
    hourlyResetAt: row.hourly_reset_at,
  };
}
