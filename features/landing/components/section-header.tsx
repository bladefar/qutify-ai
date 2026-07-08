import { FadeIn } from "./fade-in";

type SectionHeaderProps = {
  label: string;
  title: string;
  description: string;
};

/** Shared section heading used across Features, Pricing, and FAQ. */
export function SectionHeader({ label, title, description }: SectionHeaderProps) {
  return (
    <FadeIn className="mx-auto mb-16 max-w-2xl text-center">
      <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
        {label}
      </p>
      <h2 className="text-[clamp(1.875rem,4vw,2.25rem)] font-bold tracking-tight">
        {title}
      </h2>
      <p className="mt-4 text-muted-foreground">{description}</p>
    </FadeIn>
  );
}
