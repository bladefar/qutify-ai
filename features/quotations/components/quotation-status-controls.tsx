"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateQuotationStatusAction } from "@/features/quotations/actions";
import { QUOTATION_STATUS_TRANSITIONS } from "@/lib/quotation-status";
import type { QuotationStatus } from "@/types/quotation";

const statusVariant: Record<
  QuotationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  sent: "outline",
  accepted: "default",
  rejected: "destructive",
};

const actionDetails: Record<
  Exclude<QuotationStatus, "draft">,
  {
    label: string;
    icon: typeof Send;
    variant: "default" | "outline" | "destructive";
  }
> = {
  sent: { label: "Mark as sent", icon: Send, variant: "default" },
  accepted: { label: "Accept", icon: CheckCircle2, variant: "default" },
  rejected: { label: "Reject", icon: XCircle, variant: "destructive" },
};

export function QuotationStatusControls({
  quotationId,
  status,
}: {
  quotationId: string;
  status: QuotationStatus;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nextStatuses = QUOTATION_STATUS_TRANSITIONS[status];

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
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Badge variant={statusVariant[status]} className="capitalize">
          Status: {status}
        </Badge>
        {nextStatuses.map((nextStatus) => {
          if (nextStatus === "draft") return null;
          const action = actionDetails[nextStatus];
          const Icon = action.icon;

          return (
            <Button
              key={nextStatus}
              type="button"
              variant={action.variant}
              onClick={() => updateStatus(nextStatus)}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
              {action.label}
            </Button>
          );
        })}
      </div>
      {error && <p className="max-w-sm text-right text-sm text-destructive">{error}</p>}
    </div>
  );
}
