-- ============================================================================
-- PRAGVI launch — Shared Homepage CMS (published config)
-- STATUS: CREATED FOR REVIEW — DO NOT APPLY until explicitly approved.
-- Do not run against production. Staging/local only after approval.
-- ============================================================================
-- Purpose:
--   Persist the published HomepageConfigDocument so storefront visitors can
--   read shared homepage merchandising from Supabase (not browser localStorage).
-- Scope:
--   Published singleton only. Admin drafts remain in localStorage until Publish.
--   AI Tools / tools_settings stay completely separate.
-- Does NOT:
--   Seed curated product/collection/tool IDs, change homepage defaults/fallbacks,
--   or create AI Tools tables/views.
-- Reversible:
--   DROP VIEW / DROP POLICY / DROP TABLE (see bottom). No product/order impact.
-- ============================================================================

-- Fail closed if Phase A helpers are missing (mirrors media/commerce/tools migrations).
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

-- Published homepage document singleton.
-- Empty published jsonb ('{}') means “no shared publish yet” — storefront keeps
-- existing seed/fallback behavior until an explicit Publish writes a document.
CREATE TABLE IF NOT EXISTS public.homepage_config (
  id text PRIMARY KEY DEFAULT 'default',
  -- HomepageConfigDocument JSON ({ version, sections, hero }). Never seed curated IDs here.
  published jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  published_revision bigint NOT NULL DEFAULT 0
    CHECK (published_revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT homepage_config_singleton CHECK (id = 'default')
);

DROP TRIGGER IF EXISTS homepage_config_set_updated_at ON public.homepage_config;
CREATE TRIGGER homepage_config_set_updated_at
  BEFORE UPDATE ON public.homepage_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.homepage_config IS
  'Published HomepageConfigDocument singleton. Draft stays in Admin localStorage until publish.';
COMMENT ON COLUMN public.homepage_config.published IS
  'Published HomepageConfigDocument JSON only. Empty {} until first explicit publish.';
COMMENT ON COLUMN public.homepage_config.published_at IS
  'Timestamp of the last successful publish; null until first publish.';
COMMENT ON COLUMN public.homepage_config.published_revision IS
  'Monotonic publish revision for optimistic concurrency / stale-tab detection.';

-- Public view: published fields only. No draft columns exist on the base table.
CREATE OR REPLACE VIEW public.catalog_homepage_config
WITH (security_invoker = false)
AS
SELECT
  id,
  published,
  published_at,
  published_revision,
  updated_at
FROM public.homepage_config
WHERE id = 'default';

COMMENT ON VIEW public.catalog_homepage_config IS
  'Public read of published homepage config only. No drafts.';

ALTER TABLE public.homepage_config ENABLE ROW LEVEL SECURITY;

-- No anon policies on the base table. Public reads go through the catalog view.
DROP POLICY IF EXISTS homepage_config_admin_all ON public.homepage_config;
CREATE POLICY homepage_config_admin_all
  ON public.homepage_config
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Defense in depth: deny direct base-table access for anon/PUBLIC.
REVOKE ALL ON TABLE public.homepage_config FROM anon;
REVOKE ALL ON TABLE public.homepage_config FROM PUBLIC;

GRANT SELECT ON public.catalog_homepage_config TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.homepage_config TO authenticated;
-- Next.js publish routes use the service role (RLS bypass still needs table GRANTs).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.homepage_config TO service_role;

-- ROLLBACK (manual, after approval to undo):
--   DROP VIEW IF EXISTS public.catalog_homepage_config;
--   DROP POLICY IF EXISTS homepage_config_admin_all ON public.homepage_config;
--   DROP TABLE IF EXISTS public.homepage_config;
