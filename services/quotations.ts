import { calculateQuoteTotals, type GeneratedQuoteItem } from "@/lib/quote-calculations";
import { isValidQuotationStatusTransition } from "@/lib/quotation-status";
import { createClient } from "@/lib/supabase/server";
import type {
  Quotation,
  QuotationDetail,
  QuotationItem,
  QuotationListItem,
  QuotationStatus,
} from "@/types/quotation";

type SaveQuoteInput = {
  rawInput: string;
  customerId: string | null;
  items: Array<Pick<GeneratedQuoteItem, "productId" | "quantity">>;
  gstRate: number;
  discount: number;
};

function toNumber(value: number | string) {
  return Number(value);
}

function getCustomerName(
  customer: { name: string } | { name: string }[] | null
) {
  return Array.isArray(customer) ? customer[0]?.name ?? null : customer?.name ?? null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function getQuotations(): Promise<QuotationListItem[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("quotations")
    .select("id, customer_id, total, status, created_at, customers(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((quotation) => {
    return {
      id: quotation.id,
      customer_id: quotation.customer_id,
      total: toNumber(quotation.total),
      status: quotation.status,
      created_at: quotation.created_at,
      customer_name: getCustomerName(
        quotation.customers as { name: string } | { name: string }[] | null
      ),
    } as QuotationListItem;
  });
}

export async function getQuotationById(
  id: string
): Promise<QuotationDetail | null> {
  const { supabase } = await requireUser();
  const { data: quotation, error: quotationError } = await supabase
    .from("quotations")
    .select("*, customers(name)")
    .eq("id", id)
    .maybeSingle();

  if (quotationError) throw quotationError;
  if (!quotation) return null;

  const { data: items, error: itemsError } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("quotation_id", id)
    .order("product_name", { ascending: true });

  if (itemsError) throw itemsError;

  return {
    ...quotation,
    subtotal: toNumber(quotation.subtotal),
    gst_amount: toNumber(quotation.gst_amount),
    discount: toNumber(quotation.discount),
    total: toNumber(quotation.total),
    gst_rate: toNumber(quotation.gst_rate),
    customer_name: getCustomerName(
      quotation.customers as { name: string } | { name: string }[] | null
    ),
    items: (items ?? []).map((item) => ({
      ...item,
      unit_price: toNumber(item.unit_price),
      line_total: toNumber(item.line_total),
    })) as QuotationItem[],
  } as QuotationDetail;
}

export async function updateQuotationStatus(
  id: string,
  nextStatus: QuotationStatus
): Promise<QuotationStatus> {
  const { supabase, user } = await requireUser();
  const { data: quotation, error: quotationError } = await supabase
    .from("quotations")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (quotationError) throw quotationError;
  if (!quotation) throw new Error("Quotation not found");

  const currentStatus = quotation.status as QuotationStatus;
  if (!isValidQuotationStatusTransition(currentStatus, nextStatus)) {
    throw new Error(`Cannot change quotation from ${currentStatus} to ${nextStatus}`);
  }

  const { data: updated, error: updateError } = await supabase
    .from("quotations")
    .update({ status: nextStatus })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", currentStatus)
    .select("status")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) {
    throw new Error("Quotation status changed elsewhere. Refresh and try again.");
  }

  return updated.status as QuotationStatus;
}

export async function saveDraftQuotation({
  rawInput,
  customerId,
  items,
  gstRate,
  discount,
}: SaveQuoteInput): Promise<Quotation> {
  if (!rawInput.trim()) throw new Error("Quote request is required");
  if (items.length === 0) throw new Error("Add at least one matched product");

  const { supabase, user } = await requireUser();
  const quantities = new Map<string, number>();

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Each item quantity must be a whole number above 0");
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  const productIds = Array.from(quantities.keys());
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price")
    .eq("user_id", user.id)
    .in("id", productIds);

  if (productsError) throw productsError;
  if ((products ?? []).length !== productIds.length) {
    throw new Error("One or more quote products are no longer available");
  }

  if (customerId) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError) throw customerError;
    if (!customer) throw new Error("Selected customer is not available");
  }

  const productsById = new Map((products ?? []).map((product) => [product.id, product]));
  const quoteItems: GeneratedQuoteItem[] = productIds.map((productId) => {
    const product = productsById.get(productId);
    if (!product) throw new Error("Quote product is not available");
    const quantity = quantities.get(productId) ?? 0;
    const unitPrice = toNumber(product.price);
    return {
      productId,
      productName: product.name,
      quantity,
      unitPrice,
      lineTotal: Math.round((unitPrice * quantity + Number.EPSILON) * 100) / 100,
    };
  });

  // Rebuild all money values from the current catalog on the server.
  const totals = calculateQuoteTotals(quoteItems, gstRate, discount);
  const { data: quotation, error: quotationError } = await supabase
    .from("quotations")
    .insert({
      user_id: user.id,
      customer_id: customerId,
      raw_input: rawInput.trim(),
      gst_rate: gstRate,
      subtotal: totals.subtotal,
      gst_amount: totals.gstAmount,
      discount: totals.discount,
      total: totals.total,
      status: "draft",
    })
    .select()
    .single();

  if (quotationError) throw quotationError;

  const { error: itemsError } = await supabase.from("quotation_items").insert(
    quoteItems.map((item) => ({
      quotation_id: quotation.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
    }))
  );

  if (itemsError) {
    await supabase.from("quotations").delete().eq("id", quotation.id);
    throw itemsError;
  }

  return {
    ...quotation,
    subtotal: toNumber(quotation.subtotal),
    gst_amount: toNumber(quotation.gst_amount),
    discount: toNumber(quotation.discount),
    total: toNumber(quotation.total),
    gst_rate: toNumber(quotation.gst_rate),
  } as Quotation;
}

export async function getQuoteDashboardStats() {
  const { supabase } = await requireUser();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [countResult, pipelineResult] = await Promise.all([
    supabase
      .from("quotations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth),
    supabase
      .from("quotations")
      .select("total")
      .in("status", ["draft", "sent"]),
  ]);

  if (countResult.error) throw countResult.error;
  if (pipelineResult.error) throw pipelineResult.error;

  return {
    quoteCount: countResult.count ?? 0,
    pipelineValue: (pipelineResult.data ?? []).reduce(
      (sum, quotation) => sum + toNumber(quotation.total),
      0
    ),
  };
}
