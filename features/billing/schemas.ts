import { z } from "zod";
import { PRO_CHECKOUT_PLAN_CODES } from "@/types/billing";

export const checkoutPlanSchema = z.enum(PRO_CHECKOUT_PLAN_CODES);

export const checkoutCallbackSchema = z.object({
  subscriptionRecordId: z.uuid(),
  razorpayPaymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpaySubscriptionId: z.string().regex(/^sub_[A-Za-z0-9]+$/),
  razorpaySignature: z.string().regex(/^[a-f0-9]{64}$/i),
});
