-- Quotify AI: keep the usage RPC limited to the authenticated API role.
-- Supabase grants service_role default function execution in public; this RPC
-- never needs that trusted server role, so remove the implicit grant.

REVOKE ALL
  ON FUNCTION public.consume_entitlement_usage(public.usage_metric)
  FROM service_role;
