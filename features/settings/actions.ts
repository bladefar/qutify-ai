"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { upsertBusinessProfile } from "@/services/business-profiles";

const businessProfileSchema = z.object({
  business_name: z.string().trim().min(1, "Business name is required"),
  business_email: z
    .string()
    .trim()
    .email("Enter a valid business email")
    .or(z.literal("")),
  business_phone: z.string().trim(),
  business_address: z.string().trim(),
  gst_number: z.string().trim(),
  default_gst_rate: z.coerce
    .number()
    .min(0, "GST rate must be 0 or greater")
    .max(100, "GST rate cannot exceed 100"),
});

function emptyToNull(value: string) {
  return value.trim() ? value.trim() : null;
}

export type BusinessProfileActionState = {
  error?: string;
  success?: boolean;
};

export async function saveBusinessProfileAction(
  _prev: BusinessProfileActionState,
  formData: FormData
): Promise<BusinessProfileActionState> {
  const parsed = businessProfileSchema.safeParse({
    business_name: formData.get("business_name"),
    business_email: formData.get("business_email") ?? "",
    business_phone: formData.get("business_phone") ?? "",
    business_address: formData.get("business_address") ?? "",
    gst_number: formData.get("gst_number") ?? "",
    default_gst_rate: formData.get("default_gst_rate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid profile details" };
  }

  try {
    await upsertBusinessProfile({
      business_name: parsed.data.business_name,
      business_email: emptyToNull(parsed.data.business_email),
      business_phone: emptyToNull(parsed.data.business_phone),
      business_address: emptyToNull(parsed.data.business_address),
      gst_number: emptyToNull(parsed.data.gst_number),
      default_gst_rate: parsed.data.default_gst_rate,
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save business profile",
    };
  }
}
