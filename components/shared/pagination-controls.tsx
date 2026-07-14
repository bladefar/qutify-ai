import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
};

function pageHref(page: number, searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries({ ...searchParams, page: String(page) }).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `?${params.toString()}`;
}

export function PaginationControls({
  page,
  totalPages,
  searchParams,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 pt-1">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Link
          aria-disabled={page === 1}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page === 1 && "pointer-events-none opacity-50"
          )}
          href={pageHref(Math.max(1, page - 1), searchParams)}
        >
          Previous
        </Link>
        <Link
          aria-disabled={page === totalPages}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page === totalPages && "pointer-events-none opacity-50"
          )}
          href={pageHref(Math.min(totalPages, page + 1), searchParams)}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
