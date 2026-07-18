import "server-only";

import { z } from "zod";
import { getRazorpayEnvironment } from "@/lib/razorpay/env";
import type { ProCheckoutPlanCode } from "@/types/billing";

const razorpaySubscriptionSchema = z.object({
  id: z.string().regex(/^sub_[A-Za-z0-9]+$/),
  status: z.string(),
  plan_id: z.string().regex(/^plan_[A-Za-z0-9]+$/),
});

type CreateSubscriptionInput = {
  checkoutPlanCode: ProCheckoutPlanCode;
  userId: string;
};

export class RazorpayRequestError extends Error {
  constructor(message = "Razorpay could not start the subscription checkout") {
    super(message);
    this.name = "RazorpayRequestError";
  }
}

const subscriptionSettings: Record<
  ProCheckoutPlanCode,
  { planIdEnvironmentKey: "monthly" | "annual"; totalCount: number }
> = {
  pro_monthly: { planIdEnvironmentKey: "monthly", totalCount: 120 },
  pro_annual: { planIdEnvironmentKey: "annual", totalCount: 10 },
};

function getProviderPlanId(checkoutPlanCode: ProCheckoutPlanCode) {
  const environment = getRazorpayEnvironment();
  return subscriptionSettings[checkoutPlanCode].planIdEnvironmentKey ===
    "monthly"
    ? environment.RAZORPAY_PRO_MONTHLY_PLAN_ID
    : environment.RAZORPAY_PRO_ANNUAL_PLAN_ID;
}

async function razorpayRequest(path: string, init: RequestInit) {
  const environment = getRazorpayEnvironment();
  const authorization = Buffer.from(
    `${environment.RAZORPAY_KEY_ID}:${environment.RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new RazorpayRequestError();
  }

  return response.json() as Promise<unknown>;
}

export async function createRazorpaySubscription({
  checkoutPlanCode,
  userId,
}: CreateSubscriptionInput) {
  const settings = subscriptionSettings[checkoutPlanCode];
  const expectedPlanId = getProviderPlanId(checkoutPlanCode);
  const response = await razorpayRequest("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: expectedPlanId,
      total_count: settings.totalCount,
      quantity: 1,
      customer_notify: 0,
      notes: {
        quotify_user_id: userId,
        quotify_checkout_plan: checkoutPlanCode,
      },
    }),
  });

  const parsed = razorpaySubscriptionSchema.safeParse(response);
  if (!parsed.success || parsed.data.plan_id !== expectedPlanId) {
    throw new RazorpayRequestError();
  }

  return parsed.data;
}

export async function cancelRazorpaySubscription(
  providerSubscriptionId: string
) {
  await razorpayRequest(`/subscriptions/${providerSubscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: 0 }),
  });
}

export function getRazorpayPublicKeyId() {
  return getRazorpayEnvironment().RAZORPAY_KEY_ID;
}
