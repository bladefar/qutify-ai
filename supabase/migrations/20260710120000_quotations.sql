-- Quotify AI: quotations and quotation items, scoped to auth.users

CREATE TYPE public.quotation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected');

CREATE TABLE public.quotations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers (id) ON DELETE SET NULL,
  subtotal    NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  gst_amount  NUMERIC(12, 2) NOT NULL CHECK (gst_amount >= 0),
  discount    NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total       NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  gst_rate    NUMERIC(5, 2) NOT NULL DEFAULT 18.00 CHECK (gst_rate >= 0 AND gst_rate <= 100),
  status      public.quotation_status NOT NULL DEFAULT 'draft',
  raw_input   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.quotation_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id  UUID NOT NULL REFERENCES public.quotations (id) ON DELETE CASCADE,
  product_id    UUID REFERENCES public.products (id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  line_total    NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX quotations_user_id_idx ON public.quotations (user_id);
CREATE INDEX quotations_customer_id_idx ON public.quotations (customer_id);
CREATE INDEX quotations_created_at_idx ON public.quotations (created_at DESC);
CREATE INDEX quotation_items_quotation_id_idx ON public.quotation_items (quotation_id);
CREATE INDEX quotation_items_product_id_idx ON public.quotation_items (product_id);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotations_select_own"
  ON public.quotations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "quotations_insert_own"
  ON public.quotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quotations_update_own"
  ON public.quotations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quotations_delete_own"
  ON public.quotations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "quotation_items_select_own"
  ON public.quotation_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations
      WHERE quotations.id = quotation_items.quotation_id
        AND quotations.user_id = auth.uid()
    )
  );

CREATE POLICY "quotation_items_insert_own"
  ON public.quotation_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotations
      WHERE quotations.id = quotation_items.quotation_id
        AND quotations.user_id = auth.uid()
    )
  );

CREATE POLICY "quotation_items_update_own"
  ON public.quotation_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations
      WHERE quotations.id = quotation_items.quotation_id
        AND quotations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotations
      WHERE quotations.id = quotation_items.quotation_id
        AND quotations.user_id = auth.uid()
    )
  );

CREATE POLICY "quotation_items_delete_own"
  ON public.quotation_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations
      WHERE quotations.id = quotation_items.quotation_id
        AND quotations.user_id = auth.uid()
    )
  );

GRANT USAGE ON TYPE public.quotation_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;
