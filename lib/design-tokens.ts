/**
 * Quotify AI design tokens — single source of truth for brand colors,
 * spacing, and motion values used in JS (e.g. Framer Motion animations).
 * CSS variables in globals.css mirror these for Tailwind/shadcn.
 */
export const colors = {
  background: "#09090B",
  card: "#111113",
  primary: "#3B82F6",
  accent: "#7C3AED",
  success: "#22C55E",
  danger: "#EF4444",
  foreground: "#FAFAFA",
  mutedForeground: "#A1A1AA",
  border: "#27272A",
} as const;

export const motion = {
  /** Default spring for UI entrances */
  spring: { type: "spring" as const, stiffness: 300, damping: 30 },
  /** Subtle fade-up for section reveals */
  fadeUp: {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

export const appConfig = {
  name: "Quotify AI",
  tagline: "AI-powered quotations for product businesses",
  description:
    "Generate accurate quotations from natural language, matched against your real product catalog.",
} as const;
