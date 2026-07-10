"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/services/products";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
  description: z.string().optional(),
  category: z.string().optional(),
  stock: z.coerce.number().int().min(0, "Stock must be 0 or greater").default(0),
});

function emptyToNull(value?: string) {
  return value?.trim() ? value.trim() : null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export type ProductActionState = {
  error?: string;
  success?: boolean;
};

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  try {
    const user = await requireUser();

    const parsed = productSchema.safeParse({
      name: formData.get("name"),
      price: formData.get("price"),
      description: formData.get("description") || undefined,
      category: formData.get("category") || undefined,
      stock: formData.get("stock") ?? "0",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const { name, price, description, category, stock } = parsed.data;

    await createProduct(user.id, {
      name: name.trim(),
      price,
      description: emptyToNull(description),
      category: emptyToNull(category),
      stock,
    });

    revalidatePath("/dashboard/products");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create product",
    };
  }
}

export async function updateProductAction(
  _prev: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  try {
    await requireUser();

    const id = formData.get("id");
    if (typeof id !== "string" || !id) {
      return { error: "Product ID is required" };
    }

    const parsed = productSchema.safeParse({
      name: formData.get("name"),
      price: formData.get("price"),
      description: formData.get("description") || undefined,
      category: formData.get("category") || undefined,
      stock: formData.get("stock") ?? "0",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const { name, price, description, category, stock } = parsed.data;

    await updateProduct(id, {
      name: name.trim(),
      price,
      description: emptyToNull(description),
      category: emptyToNull(category),
      stock,
    });

    revalidatePath("/dashboard/products");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update product",
    };
  }
}

export async function deleteProductAction(id: string): Promise<ProductActionState> {
  try {
    await requireUser();
    await deleteProduct(id);
    revalidatePath("/dashboard/products");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete product",
    };
  }
}
