import "server-only";

import { z } from "zod";

const razorpayEnvironmentSchema = z.object({
  RAZORPAY_MODE: z.literal("test"),
  RAZORPAY_KEY_ID: z.string().regex(/^rzp_test_[A-Za-z0-9]+$/),
  RAZORPAY_KEY_SECRET: z.string().min(16),
  RAZORPAY_PRO_MONTHLY_PLAN_ID: z.string().regex(/^plan_[A-Za-z0-9]+$/),
  RAZORPAY_PRO_ANNUAL_PLAN_ID: z.string().regex(/^plan_[A-Za-z0-9]+$/),
  APP_URL: z.string().url().refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    "APP_URL must use HTTP or HTTPS"
  ),
});

export type RazorpayEnvironment = z.infer<typeof razorpayEnvironmentSchema>;

let cachedEnvironment: RazorpayEnvironment | null = null;

/**
 * Lazy validation keeps builds deterministic while still failing closed on
 * the first billing request. No secret value is included in the thrown error.
 */
export function getRazorpayEnvironment(): RazorpayEnvironment {
  if (cachedEnvironment) return cachedEnvironment;

  const parsed = razorpayEnvironmentSchema.safeParse({
    RAZORPAY_MODE: process.env.RAZORPAY_MODE,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_PRO_MONTHLY_PLAN_ID:
      process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID,
    RAZORPAY_PRO_ANNUAL_PLAN_ID:
      process.env.RAZORPAY_PRO_ANNUAL_PLAN_ID,
    APP_URL: process.env.APP_URL,
  });

  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path[0]))]
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `Razorpay Test Mode configuration is invalid or missing: ${fields}`
    );
  }

  cachedEnvironment = parsed.data;
  return cachedEnvironment;
}
