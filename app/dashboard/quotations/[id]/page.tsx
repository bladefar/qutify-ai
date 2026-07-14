import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DownloadQuotationPdf } from "@/features/quotations/components/download-quotation-pdf";
import { getQuotationById } from "@/services/quotations";
import type { QuotationStatus } from "@/types/quotation";

export const dynamic = "force-dynamic";

const statusVariant: Record<QuotationStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  sent: "outline",
  accepted: "default",
  rejected: "destructive",
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuotationById(id);
  if (!quote) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button nativeButton={false} variant="link" className="mb-2 px-0" render={<Link href="/dashboard/quotations" />}><ArrowLeft className="size-4" /> Back to quotations</Button>
          <h1 className="text-2xl font-bold tracking-tight">Quotation</h1>
          <p className="text-sm text-muted-foreground">{quote.customer_name ?? "No customer"} · {new Date(quote.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-3">
          <DownloadQuotationPdf quote={quote} />
          <Badge variant={statusVariant[quote.status]} className="capitalize">{quote.status}</Badge>
        </div>
      </div>

      <Card className="glass"><CardContent>
        <h2 className="font-semibold">Customer request</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{quote.raw_input}</p>
      </CardContent></Card>

      <Card className="glass"><CardContent>
        <h2 className="mb-4 font-semibold">Line items</h2>
        <div className="space-y-3">
          {quote.items.map((item) => <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-4 border-b pb-3 text-sm last:border-0 last:pb-0"><div><p className="font-medium">{item.product_name}</p><p className="text-muted-foreground">{formatCurrency(item.unit_price)} each</p></div><span className="self-center text-muted-foreground">× {item.quantity}</span><span className="self-center font-medium tabular-nums">{formatCurrency(item.line_total)}</span></div>)}
        </div>
        <div className="ml-auto mt-6 max-w-xs space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(quote.subtotal)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>−{formatCurrency(quote.discount)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">GST ({quote.gst_rate}%)</span><span>{formatCurrency(quote.gst_amount)}</span></div><div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>{formatCurrency(quote.total)}</span></div></div>
      </CardContent></Card>
    </div>
  );
}
