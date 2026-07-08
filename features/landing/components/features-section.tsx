"use client";

import { features } from "@/features/landing/data";
import { FadeIn } from "./fade-in";
import { SectionHeader } from "./section-header";

/** Features grid — six emoji icon cards from approved landing.html copy. */
export function FeaturesSection() {
  return (
    <section id="features" className="border-t border-border/50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          label="Features"
          title="Everything you need to quote faster"
          description="From natural-language input to professional PDFs — Quotify handles the workflow so you can focus on closing deals."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FadeIn key={feature.title}>
              <article className="glass h-full rounded-xl p-6 transition-colors hover:border-primary/30">
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-lg ring-1 ring-primary/20">
                  {feature.emoji}
                </div>
                <h3 className="mb-2 font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
