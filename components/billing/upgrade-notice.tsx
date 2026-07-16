import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function UpgradeNotice({
  title,
  description,
  compact = false,
  showAction = true,
}: {
  title: string;
  description: string;
  compact?: boolean;
  showAction?: boolean;
}) {
  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardContent
        className={compact ? "flex items-center gap-3 py-3" : "space-y-4 py-6"}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LockKeyhole className="size-4" />
          </div>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {!compact && showAction && (
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/#pricing" />}
          >
            View Pro plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
