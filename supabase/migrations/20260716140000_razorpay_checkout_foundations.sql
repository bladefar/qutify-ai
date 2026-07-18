-- Quotify AI: Razorpay Test Mode checkout persistence and request controls.
--
-- This migration deliberately does not activate subscriptions. Browser
-- checkout authentication can only move a row from created to authenticated;
-- the existing entitlement resolver continues to require an active row with a
-- current billing period. A later verified webhook handler will own that
-- privileged transition.

-- Keep the user-facing Pro entitlement plan separate from the Razorpay billing
-- cadence selected at checkout. Both checkout options resolve to the same Pro
-- entitlements, while the provider plan IDs remain server-only environment
-- configuration and are never stored in browser-controlled input.
ALTER TABLE public.user_subscriptions
  ADD COLUMN checkout_plan_code TEXT,
  ADD COLUMN provider_payment_id TEXT,
  ADD CONSTRAINT user_subscriptions_checkout_plan_code_valid CHECK (
    checkout_plan_code IS NULL
    OR checkout_plan_code IN ('pro_monthly', 'pro_annual')
  ),
  ADD CONSTRAINT user_subscriptions_provider_payment_id_valid CHECK (
    provider_payment_id IS NULL
    OR provider_payment_id ~ '^pay_[A-Za-z0-9]+$'
  );

CREATE UNIQUE INDEX user_subscriptions_provider_payment_id_idx
  ON public.user_subscriptions (provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- One non-terminal subscription per user and checkout option. Terminal rows
-- remain as immutable history and do not prevent a later fresh checkout.
CREATE UNIQUE INDEX user_subscriptions_one_open_checkout_idx
  ON public.user_subscriptions (user_id, checkout_plan_code)
  WHERE checkout_plan_code IS NOT NULL
    AND status IN (
      'created',
      'authenticated',
      'pending',
      'active',
      'halted',
      'paused'
    );

-- Reservations close the race between duplicate server-action requests before
-- the external Razorpay subscription exists. This table is in the unexposed
-- private schema, has RLS as defense in depth, and has no API-role grants.
CREATE TABLE private.subscription_checkout_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  checkout_plan_code TEXT NOT NULL CHECK (
    checkout_plan_code IN ('pro_monthly', 'pro_annual')
  ),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (
    status IN ('reserved', 'created', 'failed')
  ),
  subscription_id UUID REFERENCES public.user_subscriptions (id)
    ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscription_checkout_attempt_status_valid CHECK (
    (status = 'reserved' AND subscription_id IS NULL)
    OR (status = 'created' AND subscription_id IS NOT NULL)
    OR status = 'failed'
  )
);

CREATE INDEX subscription_checkout_attempts_user_created_idx
  ON private.subscription_checkout_attempts (user_id, created_at DESC);

CREATE UNIQUE INDEX subscription_checkout_attempts_one_reservation_idx
  ON private.subscription_checkout_attempts (user_id, checkout_plan_code)
  WHERE status = 'reserved';

ALTER TABLE private.subscription_checkout_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.subscription_checkout_attempts
  FROM PUBLIC, anon, authenticated, service_role;

-- Reserve one checkout start atomically and enforce a rolling five-attempt
-- hourly limit. The function derives auth.uid(), accepts only the internal
-- display option code (never a provider plan ID), and serializes per-user
-- requests before checking duplicates or inserting a reservation.
CREATE OR REPLACE FUNCTION public.reserve_razorpay_subscription_checkout(
  p_checkout_plan_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  request_time TIMESTAMPTZ := statement_timestamp();
  attempt_count INTEGER;
  attempt_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_checkout_plan_code IS NULL
    OR p_checkout_plan_code NOT IN ('pro_monthly', 'pro_annual') THEN
    RAISE EXCEPTION 'Invalid checkout plan';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('billing-checkout:' || current_user_id::TEXT, 0)
  );

  -- A crashed request must not block the user forever. It still counts toward
  -- the hourly request limit, which prevents retry abuse.
  UPDATE private.subscription_checkout_attempts
  SET status = 'failed', updated_at = request_time
  WHERE user_id = current_user_id
    AND status = 'reserved'
    AND created_at < request_time - INTERVAL '10 minutes';

  IF EXISTS (
    SELECT 1
    FROM private.subscription_checkout_attempts a
    WHERE a.user_id = current_user_id
      AND a.checkout_plan_code = p_checkout_plan_code
      AND a.status = 'reserved'
  ) THEN
    RAISE EXCEPTION 'A checkout is already being started for this plan';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_subscriptions s
    WHERE s.user_id = current_user_id
      AND (
        s.status = 'active'
        OR (
          s.checkout_plan_code = p_checkout_plan_code
          AND s.status IN (
            'created',
            'authenticated',
            'pending',
            'halted',
            'paused'
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'You already have an active or pending subscription for this plan';
  END IF;

  SELECT count(*)::INTEGER
  INTO attempt_count
  FROM private.subscription_checkout_attempts a
  WHERE a.user_id = current_user_id
    AND a.created_at >= request_time - INTERVAL '1 hour';

  IF attempt_count >= 5 THEN
    RAISE EXCEPTION 'Too many checkout attempts. Please try again later.';
  END IF;

  INSERT INTO private.subscription_checkout_attempts (
    user_id,
    checkout_plan_code,
    status,
    created_at,
    updated_at
  )
  VALUES (
    current_user_id,
    p_checkout_plan_code,
    'reserved',
    request_time,
    request_time
  )
  RETURNING id INTO attempt_id;

  RETURN attempt_id;
END;
$$;

-- Record the provider-created subscription after the server-only Razorpay
-- request succeeds. Only the trusted backend role can call this function. It
-- can create only a non-entitling `created` row for the supplied user and a
-- reservation that already belongs to that same user; it cannot grant Pro.
CREATE OR REPLACE FUNCTION public.record_razorpay_subscription_created(
  p_user_id UUID,
  p_attempt_id UUID,
  p_provider_subscription_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request_time TIMESTAMPTZ := statement_timestamp();
  attempt private.subscription_checkout_attempts%ROWTYPE;
  pro_plan_id UUID;
  new_subscription_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'A user ID is required';
  END IF;

  IF p_provider_subscription_id IS NULL
    OR p_provider_subscription_id !~ '^sub_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Invalid provider subscription identifier';
  END IF;

  SELECT * INTO attempt
  FROM private.subscription_checkout_attempts
  WHERE id = p_attempt_id
    AND user_id = p_user_id
    AND created_at >= request_time - INTERVAL '10 minutes'
  FOR UPDATE;

  IF NOT FOUND OR attempt.status <> 'reserved' THEN
    RAISE EXCEPTION 'Checkout reservation is invalid or no longer available';
  END IF;

  SELECT id INTO pro_plan_id
  FROM public.plans
  WHERE code = 'pro'
    AND tier = 'pro'
    AND is_active = TRUE
  LIMIT 1;

  IF pro_plan_id IS NULL THEN
    RAISE EXCEPTION 'The Pro plan is not available';
  END IF;

  INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    provider,
    provider_subscription_id,
    status,
    checkout_plan_code,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    pro_plan_id,
    'razorpay',
    p_provider_subscription_id,
    'created',
    attempt.checkout_plan_code,
    request_time,
    request_time
  )
  RETURNING id INTO new_subscription_id;

  UPDATE private.subscription_checkout_attempts
  SET status = 'created',
      subscription_id = new_subscription_id,
      updated_at = request_time
  WHERE id = attempt.id;

  RETURN new_subscription_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'An active or pending subscription already exists for this plan';
END;
$$;

-- Release a reservation after a handled provider failure. This is idempotent
-- and cannot alter a successfully persisted subscription.
CREATE OR REPLACE FUNCTION public.fail_razorpay_subscription_checkout(
  p_attempt_id UUID
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

  UPDATE private.subscription_checkout_attempts
  SET status = 'failed', updated_at = statement_timestamp()
  WHERE id = p_attempt_id
    AND user_id = current_user_id
    AND status = 'reserved';

  RETURN FOUND;
END;
$$;

-- Store the result of a valid server-side Razorpay Checkout signature check.
-- `authenticated` remains non-entitling; only a future verified webhook may
-- set active billing periods and activate Pro. The function is idempotent for
-- an already-authenticated row with the same provider payment ID.
CREATE OR REPLACE FUNCTION public.mark_razorpay_checkout_authenticated(
  p_user_id UUID,
  p_subscription_id UUID,
  p_provider_payment_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_status public.subscription_status;
  existing_payment_id TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'A user ID is required';
  END IF;

  IF p_provider_payment_id IS NULL
    OR p_provider_payment_id !~ '^pay_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Invalid provider payment identifier';
  END IF;

  SELECT status, provider_payment_id
  INTO existing_status, existing_payment_id
  FROM public.user_subscriptions
  WHERE id = p_subscription_id
    AND user_id = p_user_id
    AND provider = 'razorpay'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  IF existing_status = 'authenticated'
    AND existing_payment_id = p_provider_payment_id THEN
    RETURN TRUE;
  END IF;

  IF existing_status <> 'created' THEN
    RAISE EXCEPTION 'Subscription cannot be authenticated from its current status';
  END IF;

  UPDATE public.user_subscriptions
  SET status = 'authenticated',
      provider_payment_id = p_provider_payment_id,
      updated_at = statement_timestamp()
  WHERE id = p_subscription_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_razorpay_subscription_checkout(TEXT)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.fail_razorpay_subscription_checkout(UUID)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.record_razorpay_subscription_created(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_razorpay_checkout_authenticated(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_razorpay_subscription_checkout(TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_razorpay_subscription_checkout(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_razorpay_subscription_created(UUID, UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_razorpay_checkout_authenticated(UUID, UUID, TEXT)
  TO service_role;
