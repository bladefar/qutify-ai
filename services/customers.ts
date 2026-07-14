import { createClient } from "@/lib/supabase/server";
import type {
  Customer,
  CustomerInsert,
  CustomerStatus,
  CustomerUpdate,
} from "@/types/customer";

export const CUSTOMER_PAGE_SIZE = 20;

export type CustomerPage = {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function escapeSearchTerm(value: string) {
  return value.trim().replace(/[\\%_,]/g, (character) => `\\${character}`);
}

export async function getCustomers(): Promise<Customer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getCustomersPage({
  page = 1,
  search = "",
  status = "all",
}: {
  page?: number;
  search?: string;
  status?: CustomerStatus | "all";
} = {}): Promise<CustomerPage> {
  const supabase = await createClient();
  const requestedPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  const term = escapeSearchTerm(search);
  if (term) query.or(`name.ilike.%${term}%,company.ilike.%${term}%`);
  if (status !== "all") query.eq("status", status);

  const countQuery = supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .match(status === "all" ? {} : { status });

  if (term) countQuery.or(`name.ilike.%${term}%,company.ilike.%${term}%`);
  const countResult = await countQuery;
  if (countResult.error) throw countResult.error;

  const total = countResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const from = (currentPage - 1) * CUSTOMER_PAGE_SIZE;
  const { data, error } = await query.range(from, from + CUSTOMER_PAGE_SIZE - 1);

  if (error) throw error;
  return {
    customers: data ?? [],
    total,
    page: currentPage,
    pageSize: CUSTOMER_PAGE_SIZE,
    totalPages,
  };
}

export async function getCustomerCount(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function getRecentCustomers(limit = 5): Promise<Customer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createCustomer(
  userId: string,
  input: CustomerInsert
): Promise<Customer> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(
  id: string,
  input: CustomerUpdate
): Promise<Customer> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) throw error;
}
