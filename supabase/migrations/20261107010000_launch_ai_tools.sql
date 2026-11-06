-- ============================================================================
-- PRAGVI launch — AI Tools (manual affiliate directory)
-- STATUS: CREATED FOR REVIEW — DO NOT APPLY until explicitly approved.
-- Do not run against production. Staging/local only after approval.
-- ============================================================================
-- Purpose:
--   Persist admin-managed AI tools + published tools settings so the
--   storefront can read active tools from Supabase (not browser localStorage).
-- Scope:
--   Manual CMS only. No scraping, schedulers, or discovery workers.
-- Reversible:
--   DROP VIEW / DROP POLICY / DROP TABLE (see bottom). No product/order impact.
-- ============================================================================

-- Fail closed if Phase A helpers are missing (mirrors media/commerce migrations).
DO $$
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION
      'Missing public.is_admin(). Apply Phase A migration 20260913083000_phase_a_catalog.sql first.';
  END IF;
  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION
      'Missing public.set_updated_at(). Apply Phase A migration 20260913083000_phase_a_catalog.sql first.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ai_tools (
  id text PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'OTHER',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'inactive')),
  featured boolean NOT NULL DEFAULT false,
  recommended boolean NOT NULL DEFAULT false,
  editors_pick boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  logo_url text,
  cover_image_url text,
  affiliate_url text,
  official_url text NOT NULL DEFAULT '',
  pricing jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Manual deal payload (sale title, prices, discount, coupon, expiry, etc.).
  -- Independent of affiliate_url / editorial fields.
  deal jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Admin-only blob (never exposed via catalog_ai_tools).
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_tools_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS ai_tools_status_idx ON public.ai_tools (status);
CREATE INDEX IF NOT EXISTS ai_tools_featured_idx ON public.ai_tools (featured)
  WHERE featured = true;
CREATE INDEX IF NOT EXISTS ai_tools_sort_order_idx ON public.ai_tools (sort_order);

DROP TRIGGER IF EXISTS ai_tools_set_updated_at ON public.ai_tools;
CREATE TRIGGER ai_tools_set_updated_at
  BEFORE UPDATE ON public.ai_tools
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.ai_tools IS
  'Manual AI Tools / affiliate directory. Draft/inactive rows are not public.';
COMMENT ON COLUMN public.ai_tools.deal IS
  'Manual deal fields; editable independently of affiliate_url.';
COMMENT ON COLUMN public.ai_tools.metadata IS
  'Admin-only extras (e.g. gallery, tags, monitoring stubs). Not in public view.';

-- Published storefront settings (disclosure + homepage deal ranking).
-- Admin drafts live in localStorage until Publish settings.
CREATE TABLE IF NOT EXISTS public.tools_settings (
  id text PRIMARY KEY DEFAULT 'default',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tools_settings_singleton CHECK (id = 'default')
);

DROP TRIGGER IF EXISTS tools_settings_set_updated_at ON public.tools_settings;
CREATE TRIGGER tools_settings_set_updated_at
  BEFORE UPDATE ON public.tools_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.tools_settings IS
  'Published ToolsSettings JSON only. Draft stays in Admin CMS until publish.';

-- Public view: active tools only. No metadata / admin-private fields.
-- Strip pricingNotes from pricing jsonb (admin-only notes must not leak via view).
CREATE OR REPLACE VIEW public.catalog_ai_tools
WITH (security_invoker = false)
AS
SELECT
  id,
  slug,
  name,
  tagline,
  description,
  category,
  status,
  featured,
  recommended,
  editors_pick,
  sort_order,
  logo_url,
  cover_image_url,
  affiliate_url,
  official_url,
  (pricing - 'pricingNotes') AS pricing,
  deal,
  created_at,
  updated_at
FROM public.ai_tools
WHERE status = 'active';

CREATE OR REPLACE VIEW public.catalog_tools_settings
WITH (security_invoker = false)
AS
SELECT id, settings, updated_at
FROM public.tools_settings
WHERE id = 'default';

ALTER TABLE public.ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools_settings ENABLE ROW LEVEL SECURITY;

-- No anon policies on base tables. Public reads go through views.
DROP POLICY IF EXISTS ai_tools_admin_all ON public.ai_tools;
CREATE POLICY ai_tools_admin_all
  ON public.ai_tools
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS tools_settings_admin_all ON public.tools_settings;
CREATE POLICY tools_settings_admin_all
  ON public.tools_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Defense in depth: deny direct base-table access for anon/PUBLIC (mirrors products).
REVOKE ALL ON TABLE public.ai_tools FROM anon;
REVOKE ALL ON TABLE public.ai_tools FROM PUBLIC;
REVOKE ALL ON TABLE public.tools_settings FROM anon;
REVOKE ALL ON TABLE public.tools_settings FROM PUBLIC;

GRANT SELECT ON public.catalog_ai_tools TO anon, authenticated;
GRANT SELECT ON public.catalog_tools_settings TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_tools TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tools_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_tools TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tools_settings TO service_role;

-- ROLLBACK (manual, after approval to undo):
--   DROP VIEW IF EXISTS public.catalog_tools_settings;
--   DROP VIEW IF EXISTS public.catalog_ai_tools;
--   DROP POLICY IF EXISTS tools_settings_admin_all ON public.tools_settings;
--   DROP POLICY IF EXISTS ai_tools_admin_all ON public.ai_tools;
--   DROP TABLE IF EXISTS public.tools_settings;
--   DROP TABLE IF EXISTS public.ai_tools;
