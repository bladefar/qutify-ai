export type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category: string | null;
};

export type AiMatchedItem = {
  product_id: string;
  quantity: number;
};

export type GeneratedQuoteItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type QuoteTotals = {
  subtotal: number;
  gstAmount: number;
  discount: number;
  total: number;
};

export type GeneratedQuote = QuoteTotals & {
  rawInput: string;
  gstRate: number;
  items: GeneratedQuoteItem[];
  unmatchedItems: string[];
};

function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateQuoteTotals(
  items: GeneratedQuoteItem[],
  gstRate: number,
  discount = 0
): QuoteTotals {
  if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
    throw new Error("GST rate must be between 0 and 100");
  }

  if (!Number.isFinite(discount) || discount < 0) {
    throw new Error("Discount must be 0 or greater");
  }

  const subtotal = roundCurrency(
    items.reduce((sum, item) => sum + item.lineTotal, 0)
  );
  const appliedDiscount = Math.min(roundCurrency(discount), subtotal);
  const taxableAmount = subtotal - appliedDiscount;
  const gstAmount = roundCurrency((taxableAmount * gstRate) / 100);

  return {
    subtotal,
    discount: appliedDiscount,
    gstAmount,
    total: roundCurrency(taxableAmount + gstAmount),
  };
}

export function buildGeneratedQuote({
  rawInput,
  catalog,
  matchedItems,
  unmatchedItems,
  gstRate = 18,
}: {
  rawInput: string;
  catalog: CatalogProduct[];
  matchedItems: AiMatchedItem[];
  unmatchedItems: string[];
  gstRate?: number;
}): GeneratedQuote {
  const productsById = new Map(catalog.map((product) => [product.id, product]));
  const quantitiesByProductId = new Map<string, number>();
  const invalidProductIds: string[] = [];

  for (const match of matchedItems) {
    if (!productsById.has(match.product_id)) {
      invalidProductIds.push(match.product_id);
      continue;
    }

    quantitiesByProductId.set(
      match.product_id,
      (quantitiesByProductId.get(match.product_id) ?? 0) + match.quantity
    );
  }

  const items = Array.from(quantitiesByProductId, ([productId, quantity]) => {
    const product = productsById.get(productId);
    if (!product) throw new Error("Matched product was not found in the catalog");

    const unitPrice = roundCurrency(Number(product.price));
    return {
      productId,
      productName: product.name,
      quantity,
      unitPrice,
      lineTotal: roundCurrency(unitPrice * quantity),
    };
  });

  const totals = calculateQuoteTotals(items, gstRate);

  return {
    rawInput,
    gstRate,
    items,
    unmatchedItems: Array.from(
      new Set([
        ...unmatchedItems.map((item) => item.trim()).filter(Boolean),
        ...invalidProductIds.map(
          (productId) => `Could not verify matched product (${productId})`
        ),
      ])
    ),
    ...totals,
  };
}
