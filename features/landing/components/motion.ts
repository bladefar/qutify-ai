"use client";

import { type Variants } from "framer-motion";

/** Shared Framer Motion variants — mirrors landing.html scroll fade-in. */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export const fadeUpTransition = (delay = 0) => ({
  duration: 0.5,
  delay,
  ease: [0.22, 1, 0.36, 1] as const,
});

export const viewportOnce = { once: true, margin: "-80px" as const };
