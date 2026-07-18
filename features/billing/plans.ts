import type { ProCheckoutPlanCode } from "@/types/billing";

export type BillingPlanOption = {
  code: ProCheckoutPlanCode;
  name: string;
  price: string;
  cadence: string;
  savings?: string;
};

export const PRO_BILLING_OPTIONS: BillingPlanOption[] = [
  {
    code: "pro_monthly",
    name: "Pro Monthly",
    price: "₹999",
    cadence: "per month + GST",
  },
  {
    code: "pro_annual",
    name: "Pro Annual",
    price: "₹9,990",
    cadence: "per year + GST",
    savings: "Save two months",
  },
];
