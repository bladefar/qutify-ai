"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateAiQuote } from "@/services/ai-quote";
import { saveDraftQuotation } from "@/services/quotations";
import { createCustomer } from "@/services/customers";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user;
}

export async function generateQuoteAction(rawInput: string, gstRate: number) {
  try {
    const parsedGstRate = z.coerce.number().min(0).max(100).safeParse(gstRate);
    if (!parsedGstRate.success) return { error: "GST rate must be between 0 and 100" };

    return { quote: await generateAiQuote(rawInput, { gstRate: parsedGstRate.data }) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not generate quote" };
  }
}

const saveDraftSchema = z.object({
  rawInput: z.string().trim().min(1),
  customerId: z.string().uuid().nullable(),
  gstRate: z.coerce.number().min(0).max(100),
  discount: z.coerce.number().min(0),
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.coerce.number().int().positive() }))
    .min(1),
});

export async function saveDraftQuotationAction(input: unknown) {
  try {
    const parsed = saveDraftSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid quote" };

    const quotation = await saveDraftQuotation(parsed.data);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/quotations");
    return { quotationId: quotation.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save quote" };
  }
}

export async function createQuoteCustomerAction(name: string, company?: string) {
  try {
    const customerName = name.trim();
    if (!customerName) return { error: "Customer name is required" };
    const customer = await createCustomer(await requireUser().then((user) => user.id), {
      name: customerName,
      company: company?.trim() || null,
      status: "warm",
    });
    revalidatePath("/dashboard/customers");
    return { customer };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create customer" };
  }
}
