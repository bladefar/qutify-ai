"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
} from "@/services/customers";
import {
  CUSTOMER_STATUSES,
  type CustomerStatus,
} from "@/types/customer";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  company: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(CUSTOMER_STATUSES).default("warm"),
  last_contact: z.string().optional(),
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

export type CustomerActionState = {
  error?: string;
  success?: boolean;
};

export async function createCustomerAction(
  _prev: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  try {
    const user = await requireUser();

    const parsed = customerSchema.safeParse({
      name: formData.get("name"),
      phone: formData.get("phone") || undefined,
      email: formData.get("email") || undefined,
      company: formData.get("company") || undefined,
      notes: formData.get("notes") || undefined,
      status: formData.get("status") || "warm",
      last_contact: formData.get("last_contact") || undefined,
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const { name, phone, email, company, notes, status, last_contact } =
      parsed.data;

    await createCustomer(user.id, {
      name: name.trim(),
      phone: emptyToNull(phone),
      email: emptyToNull(email),
      company: emptyToNull(company),
      notes: emptyToNull(notes),
      status: status as CustomerStatus,
      last_contact: last_contact
        ? new Date(last_contact).toISOString()
        : null,
    });

    revalidatePath("/dashboard/customers");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create customer",
    };
  }
}

export async function updateCustomerAction(
  _prev: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  try {
    await requireUser();

    const id = formData.get("id");
    if (typeof id !== "string" || !id) {
      return { error: "Customer ID is required" };
    }

    const parsed = customerSchema.safeParse({
      name: formData.get("name"),
      phone: formData.get("phone") || undefined,
      email: formData.get("email") || undefined,
      company: formData.get("company") || undefined,
      notes: formData.get("notes") || undefined,
      status: formData.get("status") || "warm",
      last_contact: formData.get("last_contact") || undefined,
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const { name, phone, email, company, notes, status, last_contact } =
      parsed.data;

    await updateCustomer(id, {
      name: name.trim(),
      phone: emptyToNull(phone),
      email: emptyToNull(email),
      company: emptyToNull(company),
      notes: emptyToNull(notes),
      status: status as CustomerStatus,
      last_contact: last_contact
        ? new Date(last_contact).toISOString()
        : null,
    });

    revalidatePath("/dashboard/customers");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update customer",
    };
  }
}

export async function deleteCustomerAction(id: string): Promise<CustomerActionState> {
  try {
    await requireUser();
    await deleteCustomer(id);
    revalidatePath("/dashboard/customers");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete customer",
    };
  }
}
