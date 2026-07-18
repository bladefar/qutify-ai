export const PLAN_TIERS = ["free", "pro"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const BILLING_INTERVALS = ["none", "monthly", "yearly"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const SUBSCRIPTION_STATUSES = [
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
  "paused",
  "cancelled",
  "expired",
  "completed",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PRO_CHECKOUT_PLAN_CODES = ["pro_monthly", "pro_annual"] as const;
export type ProCheckoutPlanCode = (typeof PRO_CHECKOUT_PLAN_CODES)[number];

export const USAGE_METRICS = ["quotations", "ai_generations"] as const;
export type UsageMetric = (typeof USAGE_METRICS)[number];

export const USAGE_PERIODS = ["hour", "month"] as const;
export type UsagePeriod = (typeof USAGE_PERIODS)[number];

export type Plan = {
  id: string;
  code: string;
  name: string;
  tier: PlanTier;
  billing_interval: BillingInterval;
  price_paise: number;
  currency: string;
  tax_inclusive: boolean;
  provider: "razorpay" | null;
  provider_plan_id: string | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type PlanEntitlements = {
  plan_id: string;
  max_products: number;
  max_monthly_quotations: number;
  max_monthly_ai_generations: number;
  max_hourly_ai_generations: number;
  pdf_export: boolean;
  analytics: boolean;
  created_at: string;
  updated_at: string;
};

export type UserSubscription = {
  id: string;
  user_id: string;
  plan_id: string;
  provider: "razorpay";
  provider_subscription_id: string;
  provider_payment_id: string | null;
  checkout_plan_code: ProCheckoutPlanCode | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_until: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UsageRecord = {
  user_id: string;
  metric: UsageMetric;
  period: UsagePeriod;
  period_start: string;
  period_end: string;
  quantity: number;
  created_at: string;
  updated_at: string;
};

export type EffectiveEntitlements = {
  subscriptionId: string | null;
  planCode: string;
  planName: string;
  tier: PlanTier;
  features: {
    pdfExport: boolean;
    analytics: boolean;
  };
  limits: {
    products: number;
    quotationsPerMonth: number;
    aiGenerationsPerMonth: number;
    aiGenerationsPerHour: number;
  };
};

export type UsageSnapshot = {
  quotationsThisMonth: number;
  aiGenerationsThisMonth: number;
  aiGenerationsThisHour: number;
};

export type UsageConsumption = {
  allowed: boolean;
  planCode: string;
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  monthlyResetAt: string;
  hourlyLimit: number | null;
  hourlyUsed: number | null;
  hourlyRemaining: number | null;
  hourlyResetAt: string | null;
};

export type AiUsageReservation = UsageConsumption & {
  reservationId: string | null;
};
