-- Quotify AI: atomic per-user limit for paid AI quote generations

CREATE TABLE public.ai_quote_generation_limits (
  user_id       UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  window_start  TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, window_start)
);

ALTER TABLE public.ai_quote_generation_limits ENABLE ROW LEVEL SECURITY;

-- Usage is intentionally available only through the security-definer RPC.
-- Authenticated users cannot read or modify another user's counters directly.
REVOKE ALL ON public.ai_quote_generation_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_ai_quote_generation()
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_window TIMESTAMPTZ := date_trunc('hour', now());
  hourly_limit CONSTANT INTEGER := 20;
  current_count INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Keep only a small rolling history for the current user.
  DELETE FROM public.ai_quote_generation_limits
  WHERE user_id = current_user_id
    AND window_start < current_window - INTERVAL '24 hours';

  INSERT INTO public.ai_quote_generation_limits (
    user_id,
    window_start,
    request_count,
    updated_at
  )
  VALUES (current_user_id, current_window, 1, now())
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET
    request_count = public.ai_quote_generation_limits.request_count + 1,
    updated_at = now()
  WHERE public.ai_quote_generation_limits.request_count < hourly_limit
  RETURNING request_count INTO current_count;

  IF current_count IS NULL THEN
    RETURN QUERY SELECT
      FALSE,
      0,
      current_window + INTERVAL '1 hour';
    RETURN;
  END IF;

  RETURN QUERY SELECT
    TRUE,
    GREATEST(hourly_limit - current_count, 0),
    current_window + INTERVAL '1 hour';
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quote_generation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_quote_generation() TO authenticated;

