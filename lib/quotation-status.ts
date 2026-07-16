import type { QuotationStatus } from "@/types/quotation";

export const QUOTATION_STATUS_TRANSITIONS: Record<
  QuotationStatus,
  readonly QuotationStatus[]
> = {
  draft: ["sent"],
  sent: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};

export function isValidQuotationStatusTransition(
  currentStatus: QuotationStatus,
  nextStatus: QuotationStatus
) {
  return QUOTATION_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}
