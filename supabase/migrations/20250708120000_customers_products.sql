-- Quotify AI: customers & products tables with RLS scoped to auth.users

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------
CREATE TYPE public.customer_status AS ENUM ('hot', 'warm', 'cold', 'closed');

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
CREATE TABLE public.customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  company       TEXT,
  notes         TEXT,
  status        public.customer_status NOT NULL DEFAULT 'warm',
  last_contact  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX customers_user_id_idx ON public.customers (user_id);
CREATE INDEX customers_status_idx ON public.customers (status);
CREATE INDEX customers_name_idx ON public.customers (name);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE public.products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  price        NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  description  TEXT,
  category     TEXT,
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX products_user_id_idx ON public.products (user_id);
CREATE INDEX products_name_idx ON public.products (name);
CREATE INDEX products_category_idx ON public.products (category);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- customers policies
CREATE POLICY "customers_select_own"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "customers_insert_own"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customers_update_own"
  ON public.customers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customers_delete_own"
  ON public.customers FOR DELETE
  USING (auth.uid() = user_id);

-- products policies
CREATE POLICY "products_select_own"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "products_insert_own"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_update_own"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_delete_own"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants (authenticated role)
-- ---------------------------------------------------------------------------
GRANT USAGE ON TYPE public.customer_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
