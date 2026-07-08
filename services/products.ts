import { createClient } from "@/lib/supabase/server";
import type { Product, ProductInsert, ProductUpdate } from "@/types/product";

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProduct(
  userId: string,
  input: ProductInsert
): Promise<Product> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(
  id: string,
  input: ProductUpdate
): Promise<Product> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) throw error;
}
