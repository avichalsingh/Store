-- RHYTHM Stage 1 commerce: orders, payment events, entitlements.
-- DO NOT apply to production without explicit approval.
--
-- Additive only: no DROP TABLE / TRUNCATE / DELETE of catalog or Storage.
-- Writes are intended for service-role API routes; customers may SELECT own rows.
-- Requires Supabase Auth (auth.users) for user_id references.
--
-- Fulfillment: public.fulfill_paid_order() runs in one DB transaction
-- (row lock + status flip + entitlement upsert + optional backfill).

BEGIN;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  currency text NOT NULL DEFAULT 'INR'
    CHECK (currency IN ('INR')),
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  razorpay_order_id text UNIQUE,
  razorpay_payment_id text,
  receipt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  product_name text NOT NULL DEFAULT '',
  unit_amount_paise integer NOT NULL CHECK (unit_amount_paise > 0),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS order_items_product_id_idx
  ON public.order_items (product_id);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'razorpay'
    CHECK (provider = 'razorpay'),
  event_id text NOT NULL,
  event_type text NOT NULL DEFAULT '',
  processing_status text NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processed', 'failed')),
  processing_error text,
  razorpay_order_id text,
  razorpay_payment_id text,
  order_id uuid REFERENCES public.orders (id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS payment_events_order_id_idx
  ON public.payment_events (order_id);
CREATE INDEX IF NOT EXISTS payment_events_processing_status_idx
  ON public.payment_events (processing_status);

CREATE TABLE IF NOT EXISTS public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS entitlements_user_id_idx
  ON public.entitlements (user_id);
CREATE INDEX IF NOT EXISTS entitlements_product_id_idx
  ON public.entitlements (product_id);

DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION
      'Missing public.set_updated_at(). Apply Phase A migration first.';
  END IF;
END $$;

DROP TRIGGER IF EXISTS orders_set_updated_at ON public.orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Atomic fulfill: lock order, mark paid, upsert entitlements (incl. backfill)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fulfill_paid_order(
  p_order_id uuid,
  p_razorpay_payment_id text,
  p_expected_razorpay_order_id text DEFAULT NULL,
  p_expected_amount_paise integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item record;
  v_entitlement_count integer := 0;
  v_already_paid boolean := false;
  v_line_count integer := 0;
BEGIN
  IF p_order_id IS NULL OR nullif(trim(p_razorpay_payment_id), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Missing order or payment id');
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Order not found');
  END IF;

  IF p_expected_razorpay_order_id IS NOT NULL
     AND v_order.razorpay_order_id IS NOT NULL
     AND v_order.razorpay_order_id IS DISTINCT FROM p_expected_razorpay_order_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Razorpay order id mismatch');
  END IF;

  IF p_expected_amount_paise IS NOT NULL
     AND v_order.amount_paise IS DISTINCT FROM p_expected_amount_paise THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payment amount mismatch');
  END IF;

  SELECT count(*)::integer INTO v_line_count
  FROM public.order_items
  WHERE order_id = v_order.id;

  IF v_line_count < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Order has no line items');
  END IF;

  IF v_order.status = 'paid' THEN
    v_already_paid := true;
  ELSIF v_order.status IN ('pending', 'failed') THEN
    UPDATE public.orders
    SET
      status = 'paid',
      razorpay_payment_id = p_razorpay_payment_id,
      paid_at = coalesce(paid_at, now()),
      updated_at = now()
    WHERE id = v_order.id
      AND status IN ('pending', 'failed');

    IF NOT FOUND THEN
      -- Concurrent updater won; re-read
      SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
      IF v_order.status IS DISTINCT FROM 'paid' THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error', format('Order status %s cannot be fulfilled', v_order.status)
        );
      END IF;
      v_already_paid := true;
    ELSE
      v_already_paid := false;
      SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    END IF;
  ELSE
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('Order status %s cannot be fulfilled', v_order.status)
    );
  END IF;

  -- Upsert entitlements for every line (also backfills if prior upsert failed)
  FOR v_item IN
    SELECT product_id FROM public.order_items WHERE order_id = v_order.id
  LOOP
    INSERT INTO public.entitlements (user_id, product_id, order_id)
    VALUES (v_order.user_id, v_item.product_id, v_order.id)
    ON CONFLICT (user_id, product_id)
    DO UPDATE SET order_id = EXCLUDED.order_id;
  END LOOP;

  SELECT count(*)::integer INTO v_entitlement_count
  FROM public.entitlements e
  WHERE e.user_id = v_order.user_id
    AND e.product_id IN (
      SELECT product_id FROM public.order_items WHERE order_id = v_order.id
    );

  IF v_entitlement_count < v_line_count THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Entitlement backfill incomplete'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'alreadyPaid', v_already_paid,
    'entitlementCount', v_entitlement_count,
    'orderId', v_order.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_paid_order(uuid, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_paid_order(uuid, text, text, integer) TO service_role;
-- Invoked via service role from Next.js API routes only.

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS order_items_select_own ON public.order_items;
CREATE POLICY order_items_select_own
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS entitlements_select_own ON public.entitlements;
CREATE POLICY entitlements_select_own
  ON public.entitlements
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.payment_events FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.orders FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.order_items FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.entitlements FROM anon, PUBLIC;

GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT SELECT ON TABLE public.order_items TO authenticated;
GRANT SELECT ON TABLE public.entitlements TO authenticated;

COMMENT ON TABLE public.orders IS
  'Razorpay-backed checkout orders. Mutations via service-role API only.';
COMMENT ON TABLE public.entitlements IS
  'Paid product access. UNIQUE(user_id, product_id); granted after captured payment.';
COMMENT ON TABLE public.payment_events IS
  'Idempotent provider event log. UNIQUE(provider, event_id); processing_status tracks fulfill.';
COMMENT ON FUNCTION public.fulfill_paid_order(uuid, text, text, integer) IS
  'Atomically mark order paid and upsert entitlements; safe to retry.';

COMMIT;
