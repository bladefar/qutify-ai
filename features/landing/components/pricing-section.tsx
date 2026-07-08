"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pricingTiers } from "@/features/landing/data";
import { FadeIn } from "./fade-in";
import { SectionHeader } from "./section-header";

/** Pricing tiers — Starter, Pro (highlighted), Business from approved landing.html. */
export function PricingSection() {
  return (
    <section id="pricing" className="border-t border-border/50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          label="Pricing"
          title="Simple, transparent plans"
          description="Start free and upgrade when your business grows. No hidden fees."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <FadeIn key={tier.name}>
              <div
                className={cn(
                  "glass relative flex h-full flex-col rounded-2xl p-6",
                  tier.highlighted && "glow-primary border-primary/40"
                )}
              >
                {tier.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most popular
                  </Badge>
                )}

                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tier.description}
                </p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {tier.price}
                  </span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>

                <ul className="my-6 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-success" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={tier.highlighted ? "default" : "outline"}
                  className="w-full"
                  render={<Link href="/register" />}
                >
                  {tier.cta}
                </Button>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
