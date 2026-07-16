import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DownloadQuotationPdf({ quotationId }: { quotationId: string }) {
  return (
    <Button
      nativeButton={false}
      variant="outline"
      render={<a href={`/api/quotations/${quotationId}/pdf`} />}
    >
      <Download className="size-4" />
      Download PDF
    </Button>
  );
}
