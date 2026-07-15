-- Quotify AI: one business profile per authenticated user

CREATE TABLE public.business_profiles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  business_name      TEXT NOT NULL,
  business_email     TEXT,
  business_phone     TEXT,
  business_address   TEXT,
  gst_number         TEXT,
  logo_url           TEXT,
  default_gst_rate   NUMERIC(5, 2) NOT NULL DEFAULT 18.00
    CHECK (default_gst_rate >= 0 AND default_gst_rate <= 100),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX business_profiles_user_id_idx ON public.business_profiles (user_id);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_profiles_select_own"
  ON public.business_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "business_profiles_insert_own"
  ON public.business_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "business_profiles_update_own"
  ON public.business_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "business_profiles_delete_own"
  ON public.business_profiles FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_profiles TO authenticated;
