-- Quotify AI: avoid collision with PostgreSQL's CURRENT_TIME keyword.

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
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  month_start := date_trunc('month', request_time AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  month_end := month_start + INTERVAL '1 month';
  hour_start := date_trunc('hour', request_time AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  hour_end := hour_start + INTERVAL '1 hour';

  SELECT
    p.code,
    CASE
      WHEN p_metric = 'quotations' THEN e.max_monthly_quotations
      ELSE e.max_monthly_ai_generations
    END,
    CASE
      WHEN p_metric = 'ai_generations' THEN e.max_hourly_ai_generations
      ELSE NULL
    END
  INTO effective_plan_code, monthly_max, hourly_max
  FROM public.plans p
  JOIN public.entitlements e ON e.plan_id = p.id
  WHERE p.id = COALESCE(
    (
      SELECT us.plan_id
      FROM public.user_subscriptions us
      WHERE us.user_id = current_user_id
        AND us.status = 'active'
        AND us.current_period_start <= request_time
        AND us.current_period_end > request_time
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
  );

  IF effective_plan_code IS NULL OR monthly_max IS NULL THEN
    RAISE EXCEPTION 'No effective billing plan is configured';
  END IF;

  -- Serialize usage updates for one user so concurrent requests cannot both
  -- pass a limit check and over-consume the same period.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::TEXT, 0)
  );

  DELETE FROM public.usage_tracking
  WHERE user_id = current_user_id
    AND period_end < request_time - INTERVAL '13 months';

  SELECT ut.quantity
  INTO month_count
  FROM public.usage_tracking ut
  WHERE ut.user_id = current_user_id
    AND ut.metric = p_metric
    AND ut.period = 'month'
    AND ut.period_start = month_start;

  month_count := COALESCE(month_count, 0);

  IF p_metric = 'ai_generations' THEN
    SELECT ut.quantity
    INTO hour_count
    FROM public.usage_tracking ut
    WHERE ut.user_id = current_user_id
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
      CASE WHEN hourly_max IS NULL THEN NULL ELSE hour_end END;
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
    current_user_id,
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
      current_user_id,
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
    CASE WHEN hourly_max IS NULL THEN NULL ELSE hour_end END;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_entitlement_usage(public.usage_metric)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.consume_entitlement_usage(public.usage_metric)
  TO authenticated;
