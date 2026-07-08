import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  showText?: boolean;
};

/** Quotify wordmark + icon used across marketing and dashboard shells. */
export function BrandLogo({ className, showText = true }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
        <span className="text-sm font-bold text-primary">Q</span>
      </div>
      {showText && (
        <span className="text-base font-semibold tracking-tight">
          Quotify<span className="text-muted-foreground"> AI</span>
        </span>
      )}
    </div>
  );
}
