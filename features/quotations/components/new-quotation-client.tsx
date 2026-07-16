"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeNotice } from "@/components/billing/upgrade-notice";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateQuoteTotals,
  type GeneratedQuoteItem,
} from "@/lib/quote-calculations";
import {
  createQuoteCustomerAction,
  generateQuoteAction,
  saveDraftQuotationAction,
} from "@/features/quotations/actions";
import type { Customer } from "@/types/customer";

type NewQuotationClientProps = {
  initialCustomers: Customer[];
  defaultGstRate: number;
  quotationUsage: number;
  quotationLimit: number;
  planName: string;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function NewQuotationClient({
  initialCustomers,
  defaultGstRate,
  quotationUsage,
  quotationLimit,
  planName,
}: NewQuotationClientProps) {
  const router = useRouter();
  const [rawInput, setRawInput] = useState("");
  const [items, setItems] = useState<GeneratedQuoteItem[]>([]);
  const [unmatchedItems, setUnmatchedItems] = useState<string[]>([]);
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState<string>("");
  const [discount, setDiscount] = useState("0");
  const [gstRate, setGstRate] = useState(String(defaultGstRate));
  const [error, setError] = useState<string | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerCompany, setNewCustomerCompany] = useState("");
  const [isGenerating, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [isCreatingCustomer, startCreatingCustomer] = useTransition();
  const quotationLimitReached = quotationUsage >= quotationLimit;
  const quotationLimitDescription =
    planName === "Free"
      ? `You have used all ${quotationLimit} quotations available this month. Upgrade to Pro for a higher monthly limit.`
      : `You have used all ${quotationLimit} quotations available this month. New quotation capacity becomes available after the monthly reset.`;

  const totals = useMemo(() => {
    try {
      return calculateQuoteTotals(
        items,
        Number(gstRate || 0),
        Number(discount || 0)
      );
    } catch {
      return calculateQuoteTotals(items, 18, 0);
    }
  }, [discount, gstRate, items]);

  function generateQuote() {
    setError(null);
    startGenerating(async () => {
      const result = await generateQuoteAction(rawInput, Number(gstRate));
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.quote) {
        setItems(result.quote.items);
        setUnmatchedItems(result.quote.unmatchedItems);
        setGstRate(String(result.quote.gstRate));
      }
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity,
              lineTotal: Math.round((item.unitPrice * quantity + Number.EPSILON) * 100) / 100,
            }
          : item
      )
    );
  }

  function createCustomer() {
    setError(null);
    startCreatingCustomer(async () => {
      const result = await createQuoteCustomerAction(newCustomerName, newCustomerCompany);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.customer) {
        setCustomers((current) => [result.customer, ...current]);
        setCustomerId(result.customer.id);
        setNewCustomerName("");
        setNewCustomerCompany("");
        setShowCustomerForm(false);
      }
    });
  }

  function saveDraft() {
    setError(null);
    startSaving(async () => {
      const result = await saveDraftQuotationAction({
        rawInput,
        customerId: customerId || null,
        items: items.map(({ productId, quantity }) => ({ productId, quantity })),
        gstRate: Number(gstRate),
        discount: Number(discount),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.quotationId) router.push(`/dashboard/quotations/${result.quotationId}`);
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New quotation</h1>
        <p className="text-sm text-muted-foreground">
          Describe what the customer needs. AI matches only products in your catalog.
        </p>
      </div>

      {quotationLimitReached && (
        <UpgradeNotice
          title={`${planName} monthly quotation limit reached`}
          description={quotationLimitDescription}
          showAction={planName === "Free"}
        />
      )}

      <Card className="glass">
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="quote-request">Customer request</Label>
            <Textarea
              id="quote-request"
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              rows={4}
              placeholder="e.g. 50 cotton shirts and 20 blue polo shirts"
            />
          </div>
          <Button onClick={generateQuote} disabled={isGenerating || !rawInput.trim()}>
            {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {isGenerating ? "Matching catalog…" : "Generate quote"}
          </Button>
        </CardContent>
      </Card>

      {(items.length > 0 || unmatchedItems.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
          <div className="space-y-6">
            {unmatchedItems.length > 0 && (
              <Card className="border-amber-500/40 bg-amber-500/5">
                <CardContent>
                  <h2 className="font-semibold">Needs your attention</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    These requests were not confidently matched to your catalog.
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                    {unmatchedItems.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card className="glass">
              <CardContent>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold">Matched line items</h2>
                  <span className="text-sm text-muted-foreground">Review before saving</span>
                </div>
                {items.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No catalog products were matched.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.productId} className="grid grid-cols-[1fr_5rem_6rem_auto] items-center gap-3 border-b pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(item.unitPrice)} each</p>
                        </div>
                        <Input
                          aria-label={`Quantity for ${item.productName}`}
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(event) => updateQuantity(item.productId, Math.max(1, Number(event.target.value) || 1))}
                        />
                        <p className="text-right text-sm font-medium tabular-nums">{formatCurrency(item.lineTotal)}</p>
                        <Button variant="ghost" size="icon-sm" onClick={() => setItems((current) => current.filter((line) => line.productId !== item.productId))}>
                          <Trash2 className="size-4" />
                          <span className="sr-only">Remove {item.productName}</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="glass h-fit">
            <CardContent className="space-y-4">
              <h2 className="font-semibold">Quote details</h2>
              <div className="grid gap-2">
                <Label htmlFor="quote-customer">Customer</Label>
                <select id="quote-customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                  <option value="">No customer selected</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.company ? ` — ${customer.company}` : ""}</option>)}
                </select>
                <Button variant="link" className="w-fit px-0" onClick={() => setShowCustomerForm((open) => !open)}>
                  <Plus className="size-4" /> Create customer
                </Button>
                {showCustomerForm && (
                  <div className="space-y-2 rounded-lg border p-3">
                    <Input value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} placeholder="Customer name" />
                    <Input value={newCustomerCompany} onChange={(event) => setNewCustomerCompany(event.target.value)} placeholder="Company (optional)" />
                    <Button size="sm" onClick={createCustomer} disabled={isCreatingCustomer || !newCustomerName.trim()}>
                      {isCreatingCustomer ? "Creating…" : "Add customer"}
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label htmlFor="gst-rate">GST %</Label><Input id="gst-rate" type="number" min="0" max="100" step="0.01" value={gstRate} onChange={(event) => setGstRate(event.target.value)} /></div>
                <div className="grid gap-2"><Label htmlFor="discount">Discount ₹</Label><Input id="discount" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div>
              </div>
              <div className="space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>−{formatCurrency(totals.discount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatCurrency(totals.gstAmount)}</span></div>
                <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
              </div>
              <Button
                className="w-full"
                onClick={saveDraft}
                disabled={isSaving || items.length === 0 || quotationLimitReached}
              >
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                {isSaving ? "Saving…" : "Save draft"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
