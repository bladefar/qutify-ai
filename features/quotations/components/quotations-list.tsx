import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { QuotationListItem, QuotationStatus } from "@/types/quotation";

const statusVariant: Record<QuotationStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  sent: "outline",
  accepted: "default",
  rejected: "destructive",
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function QuotationsList({ quotations }: { quotations: QuotationListItem[] }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Quotations</h1><p className="text-sm text-muted-foreground">Draft, review, and track customer quotes.</p></div>
        <Button nativeButton={false} render={<Link href="/dashboard/quotations/new" />}><Plus className="size-4" /> New quotation</Button>
      </div>
      <Card className="glass py-0"><CardContent className="px-0">
        <Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>{quotations.length === 0 ? <TableRow><TableCell colSpan={4} className="h-40 text-center text-muted-foreground">No quotations yet. Create your first draft.</TableCell></TableRow> : quotations.map((quote) => <TableRow key={quote.id}><TableCell><Link className="font-medium hover:text-primary" href={`/dashboard/quotations/${quote.id}`}>{quote.customer_name ?? "No customer"}</Link></TableCell><TableCell className="tabular-nums">{formatCurrency(quote.total)}</TableCell><TableCell><Badge variant={statusVariant[quote.status]} className="capitalize">{quote.status}</Badge></TableCell><TableCell className="text-muted-foreground">{new Date(quote.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</TableCell></TableRow>)}</TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
