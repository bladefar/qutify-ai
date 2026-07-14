import assert from "node:assert/strict";
import { buildGeneratedQuote } from "../lib/quote-calculations";

const quote = buildGeneratedQuote({
  rawInput: "I need 2 cotton shirts and 3 mystery widgets",
  catalog: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Cotton Shirt",
      price: 499.5,
      description: "Regular-fit cotton shirt",
      category: "Apparel",
    },
  ],
  matchedItems: [
    { product_id: "11111111-1111-4111-8111-111111111111", quantity: 2 },
  ],
  unmatchedItems: ["3 mystery widgets"],
  gstRate: 18,
});

assert.deepEqual(quote.items, [
  {
    productId: "11111111-1111-4111-8111-111111111111",
    productName: "Cotton Shirt",
    quantity: 2,
    unitPrice: 499.5,
    lineTotal: 999,
  },
]);
assert.deepEqual(quote.unmatchedItems, ["3 mystery widgets"]);
assert.deepEqual(
  {
    subtotal: quote.subtotal,
    gstAmount: quote.gstAmount,
    discount: quote.discount,
    total: quote.total,
  },
  { subtotal: 999, gstAmount: 179.82, discount: 0, total: 1178.82 }
);

console.log("AI quote calculation verification passed:");
console.log(JSON.stringify(quote, null, 2));
