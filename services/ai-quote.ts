import "server-only";

import { OpenRouter } from "@openrouter/sdk";
import { z } from "zod";
import {
  buildGeneratedQuote,
  type CatalogProduct,
  type GeneratedQuote,
} from "@/lib/quote-calculations";
import { createClient } from "@/lib/supabase/server";
import { consumeAiGenerationQuota } from "@/services/ai-rate-limit";

const aiMatchSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
});

const aiResponseSchema = z.object({
  matched_items: z.array(aiMatchSchema),
  unmatched_items: z.array(z.string()),
});

const quoteResponseFormat = {
  type: "json_schema" as const,
  jsonSchema: {
    name: "catalog_quote_matches",
    strict: true,
    schema: {
      type: "object",
      properties: {
        matched_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_id: { type: "string" },
              quantity: { type: "integer", minimum: 1 },
            },
            required: ["product_id", "quantity"],
            additionalProperties: false,
          },
        },
        unmatched_items: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["matched_items", "unmatched_items"],
      additionalProperties: false,
    },
  },
};

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  return new OpenRouter({
    apiKey,
    appTitle: "Quotify AI",
  });
}

function getResponseText(content: unknown) {
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter returned an empty or non-text response");
  }
  return content;
}

async function getCatalogForCurrentUser(): Promise<CatalogProduct[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, description, category")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((product) => ({
    ...product,
    price: Number(product.price),
  }));
}

export async function generateAiQuote(
  rawInput: string,
  { gstRate = 18 }: { gstRate?: number } = {}
): Promise<GeneratedQuote> {
  const request = rawInput.trim();
  if (!request) throw new Error("Enter a customer request to generate a quote");

  const catalog = await getCatalogForCurrentUser();
  if (catalog.length === 0) {
    throw new Error("Add at least one product before generating a quote");
  }

  await consumeAiGenerationQuota();

  const response = await getOpenRouterClient().chat.send({
    chatRequest: {
      model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
      temperature: 0,
      stream: false,
      responseFormat: quoteResponseFormat,
      messages: [
        {
          role: "system",
          content:
            "Match the customer's request only to the supplied catalog. Never invent a product, product ID, price, or quantity. Return every requested item that cannot be confidently matched in unmatched_items. Do not calculate money; only return product IDs and quantities.",
        },
        {
          role: "user",
          content: JSON.stringify({ customer_request: request, catalog }),
        },
      ],
    },
  });

  const parsedJson = JSON.parse(
    getResponseText(response.choices[0]?.message.content)
  );
  const parsed = aiResponseSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw new Error("OpenRouter returned an invalid quote match response");
  }

  // Prices, line totals, GST, discounts, and final totals are deliberately
  // calculated from the catalog here—not accepted from the model response.
  return buildGeneratedQuote({
    rawInput: request,
    catalog,
    matchedItems: parsed.data.matched_items,
    unmatchedItems: parsed.data.unmatched_items,
    gstRate,
  });
}
