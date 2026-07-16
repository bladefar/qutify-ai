"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateQuotationStatusAction } from "@/features/quotations/actions";
import { QUOTATION_STATUS_TRANSITIONS } from "@/lib/quotation-status";
import type { QuotationStatus } from "@/types/quotation";

const actionDetails: Record<
  Exclude<QuotationStatus, "draft">,
  { label: string; icon: typeof Send }
> = {
  sent: { label: "Mark as sent", icon: Send },
  accepted: { label: "Mark as accepted", icon: CheckCircle2 },
  rejected: { label: "Mark as rejected", icon: XCircle },
};

export function QuotationStatusMenu({
  quotationId,
  status,
}: {
  quotationId: string;
  status: QuotationStatus;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nextStatuses = QUOTATION_STATUS_TRANSITIONS[status];

  if (nextStatuses.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  function updateStatus(nextStatus: QuotationStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateQuotationStatusAction({
        quotationId,
        nextStatus,
      });

      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={pending}
          render={<Button variant="ghost" size="icon-sm" />}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MoreHorizontal className="size-4" />
          )}
          <span className="sr-only">Change quotation status</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Change status</DropdownMenuLabel>
            {nextStatuses.map((nextStatus) => {
              if (nextStatus === "draft") return null;
              const action = actionDetails[nextStatus];
              const Icon = action.icon;

              return (
                <DropdownMenuItem
                  key={nextStatus}
                  variant={nextStatus === "rejected" ? "destructive" : "default"}
                  onClick={() => updateStatus(nextStatus)}
                >
                  <Icon className="size-4" />
                  {action.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p className="max-w-48 text-right text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
