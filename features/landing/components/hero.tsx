"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn } from "./fade-in";

/** Approved quote-card mockup from landing.html — copy and amounts preserved exactly. */
function QuoteCardMockup() {
  return (
    <div className="glass glow-primary rounded-2xl p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            AI Assistant
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            &ldquo;Customer wants 50 Nike shirts and 20 Lacoste polos&rdquo;
          </p>
        </div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
          ✦
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-background/60 p-4">
        <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <p className="font-medium">Quotation</p>
            <p className="text-sm text-muted-foreground">Rajesh Traders</p>
          </div>
          <Badge className="bg-brand-success/10 text-brand-success hover:bg-brand-success/10">
            Matched
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">50× Nike Dri-FIT Shirt</span>
            <span className="tabular-nums font-medium">₹44,950</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              20× Lacoste Classic Polo
            </span>
            <span className="tabular-nums font-medium">₹49,980</span>
          </div>
        </div>

        <div className="mt-2 space-y-2 border-t border-border/60 pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">₹94,930</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>GST (18%)</span>
            <span className="tabular-nums">₹17,087</span>
          </div>
          <div className="flex justify-between text-brand-success">
            <span>Discount</span>
            <span className="tabular-nums">−₹5,000</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums text-primary">₹1,07,017</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hero section — headline, CTAs, and the approved AI quote-card mockup.
 * Stagger delays match landing.html: 0 → 0.1 → 0.2 → 0.3 → 0.4s.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      {/* Decorative blobs — custom Tailwind, no shadcn equivalent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.18),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/3 size-[500px] rounded-full bg-brand-accent/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 bottom-0 size-[400px] rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-8">
          <FadeIn delay={0}>
            <Badge variant="secondary" className="glass px-3 py-1">
              ✦ AI-powered quotations
            </Badge>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.1] tracking-tight">
              Turn customer requests into{" "}
              <span className="text-gradient">ready-to-send quotes</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="max-w-lg text-lg text-muted-foreground">
              Generate accurate quotations from natural language, matched against
              your real product catalog. Built for small businesses that sell
              physical products — apparel, electronics, hardware, and more.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="flex flex-wrap gap-3">
              <Button nativeButton={false} size="lg" render={<Link href="/register" />}>
                Start for free →
              </Button>
              <Button
                nativeButton={false}
                variant="outline"
                size="lg"
                render={<Link href="#features" />}
              >
                See how it works
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.4}>
            <p className="text-sm text-muted-foreground">
              No credit card required · Free for up to 25 products
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={0.2}>
          <QuoteCardMockup />
        </FadeIn>
      </div>
    </section>
  );
}
