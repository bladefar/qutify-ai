-- Quotify AI: billing plans, entitlements, subscriptions, and usage foundations
--
-- This migration does not collect payments or grant paid access. A user only
-- receives Pro entitlements after a trusted server process later creates an
-- active subscription with a current billing period. All other users resolve
-- to the seeded Free plan.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.plan_tier AS ENUM ('free', 'pro');
CREATE TYPE public.billing_interval AS ENUM ('none', 'monthly', 'yearly');
CREATE TYPE public.billing_provider AS ENUM ('razorpay');
CREATE TYPE public.subscription_status AS ENUM (
  'created',
  'authenticated',
  'active',
  'pending',
  'halted',
  'paused',
  'cancelled',
  'expired',
  'completed'
);
CREATE TYPE public.usage_metric AS ENUM ('quotations', 'ai_generations');
CREATE TYPE public.usage_period AS ENUM ('hour', 'month');

-- ---------------------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------------------
CREATE TABLE public.plans (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT NOT NULL UNIQUE
    CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  name               TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  tier               public.plan_tier NOT NULL,
  billing_interval   public.billing_interval NOT NULL,
  price_paise        BIGINT NOT NULL CHECK (price_paise >= 0),
  currency           TEXT NOT NULL DEFAULT 'INR'
    CHECK (currency ~ '^[A-Z]{3}$'),
  tax_inclusive      BOOLEAN NOT NULL DEFAULT FALSE,
  provider           public.billing_provider,
  provider_plan_id   TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  is_public          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plans_price_matches_tier CHECK (
    (tier = 'free' AND billing_interval = 'none' AND price_paise = 0)
    OR
    (tier = 'pro' AND billing_interval <> 'none' AND price_paise > 0)
  ),
  CONSTRAINT plans_provider_fields_match CHECK (
    (provider IS NULL AND provider_plan_id IS NULL)
    OR
    provider IS NOT NULL
  )
);

CREATE UNIQUE INDEX plans_provider_plan_id_idx
  ON public.plans (provider, provider_plan_id)
  WHERE provider_plan_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- entitlements
-- One row per plan keeps feature flags and numerical limits strongly typed.
-- ---------------------------------------------------------------------------
CREATE TABLE public.entitlements (
  plan_id                      UUID PRIMARY KEY
    REFERENCES public.plans (id) ON DELETE CASCADE,
  max_products                 INTEGER NOT NULL CHECK (max_products > 0),
  max_monthly_quotations       INTEGER NOT NULL
    CHECK (max_monthly_quotations > 0),
  max_monthly_ai_generations   INTEGER NOT NULL
    CHECK (max_monthly_ai_generations > 0),
  max_hourly_ai_generations    INTEGER NOT NULL
    CHECK (max_hourly_ai_generations > 0),
  pdf_export                   BOOLEAN NOT NULL DEFAULT FALSE,
  analytics                    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_subscriptions
-- There is intentionally no INSERT/UPDATE/DELETE policy for authenticated
-- users. Only a future trusted payment handler may create or activate rows.
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL
    REFERENCES auth.users (id) ON DELETE CASCADE,
  plan_id                   UUID NOT NULL
    REFERENCES public.plans (id) ON DELETE RESTRICT,
  provider                  public.billing_provider NOT NULL DEFAULT 'razorpay',
  provider_subscription_id  TEXT NOT NULL UNIQUE,
  status                    public.subscription_status NOT NULL DEFAULT 'created',
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  grace_until               TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at              TIMESTAMPTZ,
  ended_at                  TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_subscriptions_period_valid CHECK (
    (current_period_start IS NULL AND current_period_end IS NULL)
    OR
    (
      current_period_start IS NOT NULL
      AND current_period_end IS NOT NULL
      AND current_period_end > current_period_start
    )
  ),
  CONSTRAINT user_subscriptions_active_has_period CHECK (
    status <> 'active'
    OR (current_period_start IS NOT NULL AND current_period_end IS NOT NULL)
  ),
  CONSTRAINT user_subscriptions_grace_valid CHECK (
    grace_until IS NULL
    OR current_period_end IS NULL
    OR grace_until >= current_period_end
  )
);

CREATE INDEX user_subscriptions_user_id_idx
  ON public.user_subscriptions (user_id);
CREATE INDEX user_subscriptions_plan_id_idx
  ON public.user_subscriptions (plan_id);
CREATE UNIQUE INDEX user_subscriptions_one_active_per_user_idx
  ON public.user_subscriptions (user_id)
  WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- usage_tracking
-- Counters are user-readable but never directly writable. The protected RPC
-- below is the only authenticated write path and derives limits from the DB.
-- ---------------------------------------------------------------------------
CREATE TABLE public.usage_tracking (
  user_id       UUID NOT NULL
    REFERENCES auth.users (id) ON DELETE CASCADE,
  metric        public.usage_metric NOT NULL,
  period        public.usage_period NOT NULL,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, metric, period, period_start),
  CONSTRAINT usage_tracking_period_valid CHECK (period_end > period_start),
  CONSTRAINT usage_tracking_metric_period_valid CHECK (
    (metric = 'quotations' AND period = 'month')
    OR metric = 'ai_generations'
  )
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- This trigger function is not a privileged API and does not bypass RLS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_billing_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER plans_set_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_billing_updated_at();

CREATE TRIGGER entitlements_set_updated_at
  BEFORE UPDATE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_billing_updated_at();

CREATE TRIGGER user_subscriptions_set_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_billing_updated_at();

CREATE TRIGGER usage_tracking_set_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW EXECUTE FUNCTION public.set_billing_updated_at();

REVOKE ALL ON FUNCTION public.set_billing_updated_at() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed launch plans and entitlements
-- Pro is priced at INR 999 before GST. No provider plan ID exists yet.
-- ---------------------------------------------------------------------------
INSERT INTO public.plans (
  code,
  name,
  tier,
  billing_interval,
  price_paise,
  currency,
  tax_inclusive,
  provider,
  provider_plan_id,
  is_active,
  is_public
)
VALUES
  (
    'free',
    'Free',
    'free',
    'none',
    0,
    'INR',
    FALSE,
    NULL,
    NULL,
    TRUE,
    TRUE
  ),
  (
    'pro',
    'Pro',
    'pro',
    'monthly',
    99900,
    'INR',
    FALSE,
    'razorpay',
    NULL,
    TRUE,
    TRUE
  );

INSERT INTO public.entitlements (
  plan_id,
  max_products,
  max_monthly_quotations,
  max_monthly_ai_generations,
  max_hourly_ai_generations,
  pdf_export,
  analytics
)
SELECT
  p.id,
  limits.max_products,
  limits.max_monthly_quotations,
  limits.max_monthly_ai_generations,
  limits.max_hourly_ai_generations,
  limits.pdf_export,
  limits.analytics
FROM public.plans p
JOIN (
  VALUES
    ('free', 25, 20, 10, 5, FALSE, FALSE),
    ('pro', 500, 250, 150, 20, TRUE, TRUE)
) AS limits (
  code,
  max_products,
  max_monthly_quotations,
  max_monthly_ai_generations,
  max_hourly_ai_generations,
  pdf_export,
  analytics
) ON limits.code = p.code;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Plans and entitlements are safe reference data for authenticated users to
-- read. Visibility never grants a plan; effective access is derived from a
-- trusted active subscription. All writes remain unavailable to users.
-- ---------------------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_authenticated"
  ON public.plans FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "entitlements_select_authenticated"
  ON public.entitlements FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "user_subscriptions_select_own"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "usage_tracking_select_own"
  ON public.usage_tracking FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.plans FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.entitlements FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.user_subscriptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.usage_tracking FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.plans TO authenticated;
GRANT SELECT ON public.entitlements TO authenticated;
GRANT SELECT ON public.user_subscriptions TO authenticated;
GRANT SELECT ON public.usage_tracking TO authenticated;

REVOKE ALL ON TYPE public.plan_tier FROM PUBLIC, anon;
REVOKE ALL ON TYPE public.billing_interval FROM PUBLIC, anon;
REVOKE ALL ON TYPE public.billing_provider FROM PUBLIC, anon;
REVOKE ALL ON TYPE public.subscription_status FROM PUBLIC, anon;
REVOKE ALL ON TYPE public.usage_metric FROM PUBLIC, anon;
REVOKE ALL ON TYPE public.usage_period FROM PUBLIC, anon;

GRANT USAGE ON TYPE public.plan_tier TO authenticated;
GRANT USAGE ON TYPE public.billing_interval TO authenticated;
GRANT USAGE ON TYPE public.billing_provider TO authenticated;
GRANT USAGE ON TYPE public.subscription_status TO authenticated;
GRANT USAGE ON TYPE public.usage_metric TO authenticated;
GRANT USAGE ON TYPE public.usage_period TO authenticated;

-- ---------------------------------------------------------------------------
-- Atomic usage consumption foundation
-- SECURITY DEFINER is necessary because authenticated users cannot write
-- counters directly. The function fixes search_path, derives auth.uid(),
-- resolves limits from trusted tables, serializes per-user increments, and
-- never accepts a client-supplied plan or limit.
--
-- Nothing calls this function yet. Product, quotation, AI, PDF, and Analytics
-- enforcement will be wired only after this migration is reviewed and applied.
-- ---------------------------------------------------------------------------
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
