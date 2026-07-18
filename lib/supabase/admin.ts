import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/env";

function getSupabaseSecretKey() {
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error("Supabase server billing credential is not configured");
  }

  const isSecretKey = key.startsWith("sb_secret_");
  const isLegacyServiceRoleJwt = key.split(".").length === 3;
  if (!isSecretKey && !isLegacyServiceRoleJwt) {
    throw new Error("Supabase server billing credential is invalid");
  }

  return key;
}

/**
 * Dedicated backend-only client for payment-state persistence. Never attach a
 * user session to this client: doing so would replace its privileged request
 * authorization and weaken the server-only RPC boundary.
 */
export function createAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
