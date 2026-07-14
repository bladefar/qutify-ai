import { createClient } from "@/lib/supabase/server";
import type { Product, ProductInsert, ProductUpdate } from "@/types/product";

export const PRODUCT_PAGE_SIZE = 20;

export type ProductPage = {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function escapeSearchTerm(value: string) {
  return value.trim().replace(/[\\%_,]/g, (character) => `\\${character}`);
}

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getProductsPage({
  page = 1,
  search = "",
}: {
  page?: number;
  search?: string;
} = {}): Promise<ProductPage> {
  const supabase = await createClient();
  const requestedPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const term = escapeSearchTerm(search);

  const query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  const countQuery = supabase
    .from("products")
    .select("id", { count: "exact", head: true });

  if (term) {
    query.ilike("name", `%${term}%`);
    countQuery.ilike("name", `%${term}%`);
  }

  const countResult = await countQuery;
  if (countResult.error) throw countResult.error;

  const total = countResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PRODUCT_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const from = (currentPage - 1) * PRODUCT_PAGE_SIZE;
  const { data, error } = await query.range(from, from + PRODUCT_PAGE_SIZE - 1);

  if (error) throw error;
  return {
    products: data ?? [],
    total,
    page: currentPage,
    pageSize: PRODUCT_PAGE_SIZE,
    totalPages,
  };
}

export async function getProductCount(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
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
