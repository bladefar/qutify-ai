"use client";

import Script from "next/script";
import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createSubscriptionCheckout,
  verifySubscriptionCheckout,
} from "@/features/billing/actions";
import type { BillingPlanOption } from "@/features/billing/plans";
import type { ProCheckoutPlanCode } from "@/types/billing";

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayCheckoutResponse) => void | Promise<void>;
  modal: { ondismiss: () => void };
  theme: { color: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

const PRO_FEATURES = [
  "Up to 500 products",
  "250 quotations per month",
  "150 AI generations per month",
  "PDF exports and Analytics",
] as const;

export function BillingCheckout({
  options,
  disabled,
  initialMessage,
}: {
  options: BillingPlanOption[];
  disabled: boolean;
  initialMessage?: string;
}) {
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [activePlan, setActivePlan] = useState<ProCheckoutPlanCode | null>(null);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function startCheckout(option: BillingPlanOption) {
    setError("");
    setMessage("");
    setActivePlan(option.code);

    startTransition(async () => {
      if (!checkoutReady || !window.Razorpay) {
        setError("Secure checkout is still loading. Please try again.");
        setActivePlan(null);
        return;
      }

      const result = await createSubscriptionCheckout(option.code);
      if (!result.success) {
        setError(result.error);
        setActivePlan(null);
        return;
      }

      const checkout = new window.Razorpay({
        key: result.checkout.publicKeyId,
        subscription_id: result.checkout.providerSubscriptionId,
        name: "Quotify AI",
        description: option.name,
        handler: async (response) => {
          const verification = await verifySubscriptionCheckout({
            subscriptionRecordId: result.checkout.subscriptionRecordId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySubscriptionId: response.razorpay_subscription_id,
            razorpaySignature: response.razorpay_signature,
          });

          if (verification.success) {
            setMessage(verification.message);
            setError("");
          } else {
            setError(verification.error);
          }
          setActivePlan(null);
        },
        modal: {
          ondismiss: () => {
            setMessage("Checkout closed. Your plan has not changed.");
            setActivePlan(null);
          },
        },
        theme: { color: "#3b82f6" },
      });

      checkout.open();
    });
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setCheckoutReady(true)}
        onError={() => setError("Secure checkout could not be loaded.")}
      />

      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-brand-success/30 bg-brand-success/10 text-brand-success"
          }`}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {options.map((option) => (
          <Card key={option.code} className="border-primary/25 bg-primary/5">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{option.name}</CardTitle>
                  <p className="mt-2 text-3xl font-bold">{option.price}</p>
                  <p className="text-sm text-muted-foreground">{option.cadence}</p>
                </div>
                {option.savings && (
                  <span className="rounded-full bg-brand-success/10 px-2.5 py-1 text-xs font-medium text-brand-success">
                    {option.savings}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="size-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                disabled={disabled || pending || !checkoutReady}
                onClick={() => startCheckout(option)}
              >
                {pending && activePlan === option.code ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Starting secure checkout…
                  </>
                ) : disabled ? (
                  "Current plan"
                ) : (
                  `Choose ${option.name}`
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
