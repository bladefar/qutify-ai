import { createClient } from "@/lib/supabase/server";
import type {
  BusinessProfile,
  BusinessProfileInput,
} from "@/types/business-profile";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    default_gst_rate: Number(data.default_gst_rate),
  } as BusinessProfile;
}

export async function upsertBusinessProfile(
  input: BusinessProfileInput
): Promise<BusinessProfile> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("business_profiles")
    .upsert(
      {
        user_id: user.id,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    default_gst_rate: Number(data.default_gst_rate),
  } as BusinessProfile;
}
