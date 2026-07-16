-- Quotify AI: enforce Free and Pro entitlements at the database boundary.
--
-- Product and quotation limits use BEFORE INSERT triggers so authenticated
-- users cannot bypass limits through the Supabase Data API. AI generations
-- use a reservation lifecycle so the server can avoid provider calls when a
-- limit is exhausted and refund handled provider failures exactly once.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;

-- AI reservation IDs never leave trusted server code. The table lives in an
-- unexposed schema, has no client grants, and has RLS enabled as defense in
-- depth. Counters remain the authoritative usage totals.
CREATE TABLE private.usage_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  metric public.usage_metric NOT NULL,
  month_start TIMESTAMPTZ NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  CONSTRAINT usage_reservations_ai_only
    CHECK (metric = 'ai_generations'),
  CONSTRAINT usage_reservations_status_valid
    CHECK (status IN ('reserved', 'consumed', 'refunded')),
  CONSTRAINT usage_reservations_timestamps_valid CHECK (
    (status = 'reserved' AND finalized_at IS NULL AND refunded_at IS NULL)
    OR (status = 'consumed' AND finalized_at IS NOT NULL AND refunded_at IS NULL)
    OR (status = 'refunded' AND finalized_at IS NULL AND refunded_at IS NOT NULL)
  )
);

CREATE INDEX usage_reservations_user_status_idx
  ON private.usage_reservations (user_id, status);

ALTER TABLE private.usage_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.usage_reservations
  FROM PUBLIC, anon, authenticated, service_role;

-- Resolve all limits from trusted plan and subscription rows. This helper is
-- private and not executable by API roles; privileged triggers/wrappers pass
-- only an authenticated user ID or a row owner ID protected by RLS.
CREATE OR REPLACE FUNCTION private.resolve_effective_entitlements(
  p_user_id UUID,
  p_at TIMESTAMPTZ DEFAULT statement_timestamp()
)
RETURNS TABLE (
  plan_code TEXT,
  plan_name TEXT,
  plan_tier public.plan_tier,
  max_products INTEGER,
  max_monthly_quotations INTEGER,
  max_monthly_ai_generations INTEGER,
  max_hourly_ai_generations INTEGER,
  pdf_export BOOLEAN,
  analytics BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.code,
    p.name,
    p.tier,
    e.max_products,
    e.max_monthly_quotations,
    e.max_monthly_ai_generations,
    e.max_hourly_ai_generations,
    e.pdf_export,
    e.analytics
  FROM public.plans p
  JOIN public.entitlements e ON e.plan_id = p.id
  WHERE p.id = COALESCE(
    (
      SELECT us.plan_id
      FROM public.user_subscriptions us
      WHERE us.user_id = p_user_id
        AND us.status = 'active'
        AND us.current_period_start <= p_at
        AND us.current_period_end > p_at
      ORDER BY us.current_period_end DESC
      LIMIT 1
    ),
    (
      SELECT free_plan.id
      FROM public.plans free_plan
      WHERE free_plan.code = 'free'
        AND free_plan.is_active = TRUE
      LIMIT 1
    )
  )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.resolve_effective_entitlements(UUID, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated, service_role;

-- Internal atomic counter primitive. Transaction-scoped advisory locking
-- serializes all usage changes for a user, so concurrent requests cannot both
-- pass a limit check. It is unreachable through PostgREST.
CREATE OR REPLACE FUNCTION private.consume_entitlement_usage_for_user(
  p_user_id UUID,
  p_metric public.usage_metric,
  p_create_reservation BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  allowed BOOLEAN,
  plan_code TEXT,
  monthly_limit INTEGER,
  monthly_used INTEGER,
  monthly_remaining INTEGER,
  monthly_reset_at TIMESTAMPTZ,
  hourly_limit INTEGER,
  hourly_used INTEGER,
  hourly_remaining INTEGER,
  hourly_reset_at TIMESTAMPTZ,
  reservation_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request_time TIMESTAMPTZ := statement_timestamp();
  month_start TIMESTAMPTZ;
  month_end TIMESTAMPTZ;
  hour_start TIMESTAMPTZ;
  hour_end TIMESTAMPTZ;
  effective_plan_code TEXT;
  monthly_max INTEGER;
  hourly_max INTEGER;
  month_count INTEGER := 0;
  hour_count INTEGER := 0;
  created_reservation_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_create_reservation AND p_metric <> 'ai_generations' THEN
    RAISE EXCEPTION 'Reservations are supported only for AI generations';
  END IF;

  month_start := date_trunc('month', request_time AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  month_end := month_start + INTERVAL '1 month';
  hour_start := date_trunc('hour', request_time AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  hour_end := hour_start + INTERVAL '1 hour';

  -- Use one lock namespace and order for consume/refund operations.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('quotify:usage:' || p_user_id::TEXT, 0)
  );

  SELECT
    resolved.plan_code,
    CASE
      WHEN p_metric = 'quotations' THEN resolved.max_monthly_quotations
      ELSE resolved.max_monthly_ai_generations
    END,
    CASE
      WHEN p_metric = 'ai_generations' THEN resolved.max_hourly_ai_generations
      ELSE NULL
    END
  INTO effective_plan_code, monthly_max, hourly_max
  FROM private.resolve_effective_entitlements(p_user_id, request_time) resolved;

  IF effective_plan_code IS NULL OR monthly_max IS NULL THEN
    RAISE EXCEPTION 'No effective billing plan is configured';
  END IF;

  DELETE FROM public.usage_tracking
  WHERE user_id = p_user_id
    AND period_end < request_time - INTERVAL '13 months';

  DELETE FROM private.usage_reservations
  WHERE user_id = p_user_id
    AND status <> 'reserved'
    AND created_at < request_time - INTERVAL '13 months';

  SELECT ut.quantity
  INTO month_count
  FROM public.usage_tracking ut
  WHERE ut.user_id = p_user_id
    AND ut.metric = p_metric
    AND ut.period = 'month'
    AND ut.period_start = month_start;

  month_count := COALESCE(month_count, 0);

  IF p_metric = 'ai_generations' THEN
    SELECT ut.quantity
    INTO hour_count
    FROM public.usage_tracking ut
    WHERE ut.user_id = p_user_id
      AND ut.metric = p_metric
      AND ut.period = 'hour'
      AND ut.period_start = hour_start;

    hour_count := COALESCE(hour_count, 0);
  END IF;

  IF month_count >= monthly_max
    OR (hourly_max IS NOT NULL AND hour_count >= hourly_max) THEN
    RETURN QUERY SELECT
      FALSE,
      effective_plan_code,
      monthly_max,
      month_count,
      GREATEST(monthly_max - month_count, 0),
      month_end,
      hourly_max,
      CASE WHEN hourly_max IS NULL THEN NULL ELSE hour_count END,
      CASE
        WHEN hourly_max IS NULL THEN NULL
        ELSE GREATEST(hourly_max - hour_count, 0)
      END,
      CASE WHEN hourly_max IS NULL THEN NULL ELSE hour_end END,
      NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.usage_tracking (
    user_id,
    metric,
    period,
    period_start,
    period_end,
    quantity,
    updated_at
  )
  VALUES (
    p_user_id,
    p_metric,
    'month',
    month_start,
    month_end,
    1,
    request_time
  )
  ON CONFLICT (user_id, metric, period, period_start)
  DO UPDATE SET
    quantity = public.usage_tracking.quantity + 1,
    period_end = EXCLUDED.period_end,
    updated_at = EXCLUDED.updated_at
  RETURNING quantity INTO month_count;

  IF hourly_max IS NOT NULL THEN
    INSERT INTO public.usage_tracking (
      user_id,
      metric,
      period,
      period_start,
      period_end,
      quantity,
      updated_at
    )
    VALUES (
      p_user_id,
      p_metric,
      'hour',
      hour_start,
      hour_end,
      1,
      request_time
    )
    ON CONFLICT (user_id, metric, period, period_start)
    DO UPDATE SET
      quantity = public.usage_tracking.quantity + 1,
      period_end = EXCLUDED.period_end,
      updated_at = EXCLUDED.updated_at
    RETURNING quantity INTO hour_count;
  END IF;

  IF p_create_reservation THEN
    INSERT INTO private.usage_reservations (
      user_id,
      metric,
      month_start,
      hour_start
    )
    VALUES (
      p_user_id,
      p_metric,
      month_start,
      hour_start
    )
    RETURNING id INTO created_reservation_id;
  END IF;

  RETURN QUERY SELECT
    TRUE,
    effective_plan_code,
    monthly_max,
    month_count,
    GREATEST(monthly_max - month_count, 0),
    month_end,
    hourly_max,
    CASE WHEN hourly_max IS NULL THEN NULL ELSE hour_count END,
    CASE
      WHEN hourly_max IS NULL THEN NULL
      ELSE GREATEST(hourly_max - hour_count, 0)
    END,
    CASE WHEN hourly_max IS NULL THEN NULL ELSE hour_end END,
    created_reservation_id;
END;
$$;

REVOKE ALL ON FUNCTION private.consume_entitlement_usage_for_user(
  UUID,
  public.usage_metric,
  BOOLEAN
) FROM PUBLIC, anon, authenticated, service_role;

-- Keep the Part 1 RPC signature stable. It now delegates to the same internal
-- primitive used by quotation enforcement, preventing divergent counters.
CREATE OR REPLACE FUNCTION public.consume_entitlement_usage(
  p_metric public.usage_metric
)
RETURNS TABLE (
  allowed BOOLEAN,
  plan_code TEXT,
  monthly_limit INTEGER,
  monthly_used INTEGER,
  monthly_remaining INTEGER,
  monthly_reset_at TIMESTAMPTZ,
  hourly_limit INTEGER,
  hourly_used INTEGER,
  hourly_remaining INTEGER,
  hourly_reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    consumed.allowed,
    consumed.plan_code,
    consumed.monthly_limit,
    consumed.monthly_used,
    consumed.monthly_remaining,
    consumed.monthly_reset_at,
    consumed.hourly_limit,
    consumed.hourly_used,
    consumed.hourly_remaining,
    consumed.hourly_reset_at
  FROM private.consume_entitlement_usage_for_user(
    current_user_id,
    p_metric,
    FALSE
  ) consumed;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_entitlement_usage(public.usage_metric)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.consume_entitlement_usage(public.usage_metric)
  TO authenticated;

-- Reserve before contacting OpenRouter. A handled failure can refund the
-- exact unexposed reservation once; arbitrary client values cannot decrement
-- counters.
CREATE OR REPLACE FUNCTION public.reserve_ai_entitlement_usage()
RETURNS TABLE (
  allowed BOOLEAN,
  plan_code TEXT,
  monthly_limit INTEGER,
  monthly_used INTEGER,
  monthly_remaining INTEGER,
  monthly_reset_at TIMESTAMPTZ,
  hourly_limit INTEGER,
  hourly_used INTEGER,
  hourly_remaining INTEGER,
  hourly_reset_at TIMESTAMPTZ,
  reservation_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT *
  FROM private.consume_entitlement_usage_for_user(
    current_user_id,
    'ai_generations',
    TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_ai_entitlement_usage(
  p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  UPDATE private.usage_reservations
  SET
    status = 'consumed',
    finalized_at = statement_timestamp()
  WHERE id = p_reservation_id
    AND user_id = current_user_id
    AND status = 'reserved';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_ai_entitlement_usage(
  p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  reservation private.usage_reservations%ROWTYPE;
  request_time TIMESTAMPTZ := statement_timestamp();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO reservation
  FROM private.usage_reservations
  WHERE id = p_reservation_id
    AND user_id = current_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('quotify:usage:' || current_user_id::TEXT, 0)
  );

  SELECT *
  INTO reservation
  FROM private.usage_reservations
  WHERE id = p_reservation_id
    AND user_id = current_user_id
  FOR UPDATE;

  IF reservation.status <> 'reserved' THEN
    RETURN FALSE;
  END IF;

  UPDATE private.usage_reservations
  SET
    status = 'refunded',
    refunded_at = request_time
  WHERE id = p_reservation_id;

  UPDATE public.usage_tracking
  SET
    quantity = GREATEST(quantity - 1, 0),
    updated_at = request_time
  WHERE user_id = current_user_id
    AND metric = reservation.metric
    AND (
      (period = 'month' AND period_start = reservation.month_start)
      OR (period = 'hour' AND period_start = reservation.hour_start)
    );

  DELETE FROM public.usage_tracking
  WHERE user_id = current_user_id
    AND metric = reservation.metric
    AND quantity = 0
    AND (
      (period = 'month' AND period_start = reservation.month_start)
      OR (period = 'hour' AND period_start = reservation.hour_start)
    );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_entitlement_usage()
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.finalize_ai_entitlement_usage(UUID)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.refund_ai_entitlement_usage(UUID)
  FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.reserve_ai_entitlement_usage()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_ai_entitlement_usage(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_entitlement_usage(UUID)
  TO authenticated;

-- The fixed 20/hour function remains in place for migration compatibility but
-- is no longer callable by API roles or used by application code.
REVOKE ALL ON FUNCTION public.consume_ai_quote_generation()
  FROM PUBLIC, anon, authenticated, service_role;

-- Product capacity is based on current rows, so a deletion immediately frees
-- space. Existing users above a downgraded limit retain rows but cannot insert.
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

DROP TRIGGER IF EXISTS products_enforce_entitlement ON public.products;
CREATE TRIGGER products_enforce_entitlement
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION private.enforce_product_entitlement();

-- Every first insert consumes one monthly quotation unit. Deleting the row has
-- no refund path, so quota cannot be recycled by create/delete loops.
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

DROP TRIGGER IF EXISTS quotations_enforce_entitlement ON public.quotations;
CREATE TRIGGER quotations_enforce_entitlement
  BEFORE INSERT ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION private.enforce_quotation_entitlement();
