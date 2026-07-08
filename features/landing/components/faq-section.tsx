"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqItems } from "@/features/landing/data";
import { FadeIn } from "./fade-in";
import { SectionHeader } from "./section-header";

/** FAQ accordion — shadcn Accordion inside a glass container, approved copy preserved. */
export function FaqSection() {
  return (
    <section id="faq" className="border-t border-border/50 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeader
          label="FAQ"
          title="Common questions"
          description="Everything you need to know before getting started."
        />

        <FadeIn delay={0.1}>
          <Accordion className="glass rounded-xl px-4">
            {faqItems.map((item, index) => (
              <AccordionItem key={item.question} value={`item-${index}`}>
                <AccordionTrigger className="text-base hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </div>
    </section>
  );
}
