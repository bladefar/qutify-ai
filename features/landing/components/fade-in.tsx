"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  fadeUpTransition,
  fadeUpVariants,
  viewportOnce,
} from "./motion";

type FadeInProps = HTMLMotionProps<"div"> & {
  delay?: number;
  direction?: "up" | "down" | "none";
};

/** Scroll-triggered fade-in — Framer Motion port of landing.html IntersectionObserver. */
export function FadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
  ...props
}: FadeInProps) {
  const prefersReducedMotion = useReducedMotion();

  const hiddenY =
    direction === "up" ? 24 : direction === "down" ? -24 : 0;

  return (
    <motion.div
      variants={fadeUpVariants}
      initial={
        prefersReducedMotion
          ? "visible"
          : { opacity: 0, y: hiddenY }
      }
      whileInView="visible"
      viewport={viewportOnce}
      transition={fadeUpTransition(delay)}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
