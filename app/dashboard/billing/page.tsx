import { BadgeIndianRupee, Check, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BillingCheckout } from "@/features/billing/components/billing-checkout";
import { PRO_BILLING_OPTIONS } from "@/features/billing/plans";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveEntitlements } from "@/services/entitlements";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const [entitlements, pendingSubscription] = await Promise.all([
    getEffectiveEntitlements(),
    (async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("user_subscriptions")
        .select("status")
        .in("status", ["created", "authenticated", "pending"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { status: string } | null;
    })(),
  ]);

  const confirmationMessage =
    pendingSubscription?.status === "authenticated"
      ? "Payment received; confirming subscription. Pro access will begin only after payment confirmation."
      : pendingSubscription
        ? "A subscription checkout is pending. Complete or close it before starting another checkout for the same plan."
        : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Choose a Quotify AI plan for your workspace.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-500">
          <ShieldCheck className="size-3.5" />
          Razorpay Test Mode
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeIndianRupee className="size-5 text-primary" />
            Current plan
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold">{entitlements.planName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {entitlements.tier === "pro"
                ? "Your paid features are active."
                : "Your workspace is using the Free plan."}
            </p>
          </div>
          <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2 sm:gap-x-6">
            {[
              `${entitlements.limits.products} products`,
              `${entitlements.limits.quotationsPerMonth} quotes/month`,
              `${entitlements.limits.aiGenerationsPerMonth} AI generations/month`,
              entitlements.features.pdfExport
                ? "PDF export enabled"
                : "PDF export not included",
            ].map((detail) => (
              <span key={detail} className="flex items-center gap-2">
                <Check className="size-3.5 text-primary" />
                {detail}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Upgrade to Pro</h2>
          <p className="text-sm text-muted-foreground">
            Prices exclude GST. Test Mode does not create a real charge.
          </p>
        </div>
        <BillingCheckout
          options={PRO_BILLING_OPTIONS}
          disabled={entitlements.tier === "pro"}
          initialMessage={confirmationMessage}
        />
      </section>
    </div>
  );
}
