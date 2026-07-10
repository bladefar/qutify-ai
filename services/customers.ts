import { createClient } from "@/lib/supabase/server";
import type { Customer, CustomerInsert, CustomerUpdate } from "@/types/customer";

export async function getCustomers(): Promise<Customer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
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
