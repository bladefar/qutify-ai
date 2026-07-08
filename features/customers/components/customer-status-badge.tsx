import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CUSTOMER_STATUS_LABELS,
  type CustomerStatus,
} from "@/types/customer";

const statusStyles: Record<CustomerStatus, string> = {
  hot: "bg-destructive/10 text-destructive hover:bg-destructive/10",
  warm: "bg-primary/10 text-primary hover:bg-primary/10",
  cold: "bg-muted text-muted-foreground hover:bg-muted",
  closed: "bg-brand-success/10 text-brand-success hover:bg-brand-success/10",
};

type CustomerStatusBadgeProps = {
  status: CustomerStatus;
  className?: string;
};

export function CustomerStatusBadge({ status, className }: CustomerStatusBadgeProps) {
  return (
    <Badge className={cn(statusStyles[status], className)}>
      {CUSTOMER_STATUS_LABELS[status]}
    </Badge>
  );
}
