-- Quotify AI: return accurate limit messages for both launch tiers.

CREATE OR REPLACE FUNCTION private.enforce_product_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_user_id UUID := auth.uid();
  effective_plan_code TEXT;
  product_limit INTEGER;
  current_count BIGINT;
BEGIN
  IF caller_user_id IS NOT NULL AND caller_user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Cannot create a product for another user'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('quotify:products:' || NEW.user_id::TEXT, 0)
  );

  SELECT resolved.plan_code, resolved.max_products
  INTO effective_plan_code, product_limit
  FROM private.resolve_effective_entitlements(
    NEW.user_id,
    statement_timestamp()
  ) resolved;

  IF effective_plan_code IS NULL OR product_limit IS NULL THEN
    RAISE EXCEPTION 'No effective billing plan is configured';
  END IF;

  SELECT count(*)
  INTO current_count
  FROM public.products
  WHERE user_id = NEW.user_id;

  IF current_count >= product_limit THEN
    IF effective_plan_code = 'free' THEN
      RAISE EXCEPTION 'Product limit reached for Free (% products). Delete a product or upgrade to Pro.',
        product_limit
        USING ERRCODE = 'P0001';
    ELSE
      RAISE EXCEPTION 'Product limit reached for Pro (% products). Delete a product before adding another.',
        product_limit
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_product_entitlement()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.enforce_quotation_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_user_id UUID := auth.uid();
  consumption RECORD;
BEGIN
  IF caller_user_id IS NOT NULL AND caller_user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Cannot create a quotation for another user'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO consumption
  FROM private.consume_entitlement_usage_for_user(
    NEW.user_id,
    'quotations',
    FALSE
  );

  IF NOT consumption.allowed THEN
    IF consumption.plan_code = 'free' THEN
      RAISE EXCEPTION 'Monthly quotation limit reached for Free (% quotations). Upgrade to Pro for more quotations.',
        consumption.monthly_limit
        USING ERRCODE = 'P0001';
    ELSE
      RAISE EXCEPTION 'Monthly quotation limit reached for Pro (% quotations). New quotations are available after the monthly reset.',
        consumption.monthly_limit
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_quotation_entitlement()
  FROM PUBLIC, anon, authenticated, service_role;
