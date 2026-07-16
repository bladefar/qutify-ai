import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  EffectiveEntitlements,
  Plan,
  PlanEntitlements,
  UserSubscription,
} from "@/types/billing";

type PlanRow = Pick<Plan, "id" | "code" | "name" | "tier">;
type SubscriptionRow = Pick<UserSubscription, "id" | "plan_id">;

export async function getEffectiveEntitlements(): Promise<EffectiveEntitlements> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Unauthorized");

  const now = new Date().toISOString();
  const { data: activeSubscription, error: subscriptionError } = await supabase
    .from("user_subscriptions")
    .select("id, plan_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .lte("current_period_start", now)
    .gt("current_period_end", now)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;

  const subscription = activeSubscription as SubscriptionRow | null;
  const planQuery = supabase
    .from("plans")
    .select("id, code, name, tier")
    .limit(1);

  const { data: planData, error: planError } = subscription
    ? await planQuery.eq("id", subscription.plan_id).maybeSingle()
    : await planQuery.eq("code", "free").eq("is_active", true).maybeSingle();

  if (planError) throw planError;
  if (!planData) throw new Error("No effective billing plan is configured");

  const plan = planData as PlanRow;
  const { data: entitlementData, error: entitlementError } = await supabase
    .from("entitlements")
    .select(
      "plan_id, max_products, max_monthly_quotations, max_monthly_ai_generations, max_hourly_ai_generations, pdf_export, analytics"
    )
    .eq("plan_id", plan.id)
    .maybeSingle();

  if (entitlementError) throw entitlementError;
  if (!entitlementData) {
    throw new Error(`No entitlements are configured for plan ${plan.code}`);
  }

  const entitlements = entitlementData as Pick<
    PlanEntitlements,
    | "max_products"
    | "max_monthly_quotations"
    | "max_monthly_ai_generations"
    | "max_hourly_ai_generations"
    | "pdf_export"
    | "analytics"
  >;

  return {
    subscriptionId: subscription?.id ?? null,
    planCode: plan.code,
    planName: plan.name,
    tier: plan.tier,
    features: {
      pdfExport: entitlements.pdf_export,
      analytics: entitlements.analytics,
    },
    limits: {
      products: Number(entitlements.max_products),
      quotationsPerMonth: Number(entitlements.max_monthly_quotations),
      aiGenerationsPerMonth: Number(entitlements.max_monthly_ai_generations),
      aiGenerationsPerHour: Number(entitlements.max_hourly_ai_generations),
    },
  };
}
