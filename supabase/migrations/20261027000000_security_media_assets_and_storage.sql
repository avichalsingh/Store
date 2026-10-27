-- RHYTHM security hardening (additive, non-destructive).
-- DO NOT apply to production without explicit approval.
--
-- Safe for existing DBs:
-- - Does not remove tables, truncate data, or delete catalog/Storage rows
-- - CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS only
-- - Storage: use RESTRICTIVE policies to block masters even if older
--   permissive policies remain (does not blindly drop unrelated policies)
-- - Requires Phase A helpers: public.is_admin(), public.set_updated_at()
--
-- Preserves: anon SELECT on catalog_products; public media-previews reads.
-- Service role continues to bypass RLS (Admin APIs + FFmpeg worker).

-- ---------------------------------------------------------------------------
-- Prerequisites (fail closed if Phase A helpers are missing)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- media_assets: create if absent; add any missing columns (no data loss)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.media_assets (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  original_file_name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'video',
  master_bucket text NOT NULL DEFAULT 'media-masters',
  master_path text NOT NULL DEFAULT '',
  preview_bucket text NOT NULL DEFAULT '',
  preview_path text,
  preview_url text,
  thumbnail_path text,
  thumbnail_url text,
  mime_type text,
  size_bytes bigint,
  size_label text,
  resolution text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  duration_seconds numeric NOT NULL DEFAULT 0,
  processing_status text NOT NULL DEFAULT 'queued',
  processing_error text,
  processing_steps jsonb NOT NULL DEFAULT '{}'::jsonb,
  watermark_mode text NOT NULL DEFAULT 'global',
  watermark_config jsonb,
  preview_quality text,
  preview_playback text NOT NULL DEFAULT 'none',
  used_by_product_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS original_file_name text NOT NULL DEFAULT '';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'video';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS master_bucket text NOT NULL DEFAULT 'media-masters';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS master_path text NOT NULL DEFAULT '';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS preview_bucket text NOT NULL DEFAULT '';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS preview_path text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS preview_url text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS thumbnail_path text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS size_bytes bigint;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS size_label text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS resolution text NOT NULL DEFAULT '';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS duration text NOT NULL DEFAULT '';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS duration_seconds numeric NOT NULL DEFAULT 0;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'queued';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS processing_error text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS processing_steps jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS watermark_mode text NOT NULL DEFAULT 'global';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS watermark_config jsonb;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS preview_quality text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS preview_playback text NOT NULL DEFAULT 'none';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS used_by_product_ids text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON TABLE public.media_assets IS
  'Private media registry (masters + public preview metadata). Not for anon SELECT.';

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Replace only our known policy name (idempotent).
DROP POLICY IF EXISTS media_assets_admin_all ON public.media_assets;
CREATE POLICY media_assets_admin_all
  ON public.media_assets
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Drop only anon-targeting policies on this table (do not touch other tables).
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'media_assets'
      AND (
        roles = '{anon}'
        OR 'anon' = ANY (roles)
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.media_assets',
      pol.policyname
    );
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.media_assets FROM anon;
REVOKE ALL ON TABLE public.media_assets FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.media_assets TO authenticated;
-- authenticated still constrained by is_admin() RLS above.
-- service_role bypasses RLS (Next admin APIs + worker).

DROP TRIGGER IF EXISTS media_assets_set_updated_at ON public.media_assets;
CREATE TRIGGER media_assets_set_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage buckets (flags only; never deletes objects)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('media-masters', 'media-masters', false, 524288000),
  ('media-previews', 'media-previews', true, 524288000)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = COALESCE(storage.buckets.file_size_limit, EXCLUDED.file_size_limit);

-- ---------------------------------------------------------------------------
-- Storage policies
-- Replace only our named policies; use RESTRICTIVE denies so leftover
-- permissive policies cannot reopen media-masters to anon/non-admins.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS media_masters_auth_admin_all ON storage.objects;
DROP POLICY IF EXISTS media_masters_restrict_anon ON storage.objects;
DROP POLICY IF EXISTS media_masters_restrict_authenticated ON storage.objects;
DROP POLICY IF EXISTS media_previews_public_select ON storage.objects;
DROP POLICY IF EXISTS media_previews_auth_admin_write ON storage.objects;

-- Positive: JWT admins may manage masters (future Phase C). Today Admin uses
-- service_role signed uploads which bypass RLS.
CREATE POLICY media_masters_auth_admin_all
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'media-masters'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'media-masters'
    AND public.is_admin()
  );

-- Hard deny: anon never accesses media-masters, even if an older permissive
-- policy still exists.
CREATE POLICY media_masters_restrict_anon
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (bucket_id IS DISTINCT FROM 'media-masters')
  WITH CHECK (bucket_id IS DISTINCT FROM 'media-masters');

-- Hard deny: ordinary authenticated users cannot touch masters unless admin.
CREATE POLICY media_masters_restrict_authenticated
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    bucket_id IS DISTINCT FROM 'media-masters'
    OR public.is_admin()
  )
  WITH CHECK (
    bucket_id IS DISTINCT FROM 'media-masters'
    OR public.is_admin()
  );

-- Approved public previews: readable by everyone.
CREATE POLICY media_previews_public_select
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'media-previews');

-- Preview writes: JWT admins only (service_role still bypasses for worker).
CREATE POLICY media_previews_auth_admin_write
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'media-previews'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'media-previews'
    AND public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- Re-affirm catalog isolation (no product-row deletes)
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE public.products FROM anon;
GRANT SELECT ON public.catalog_products TO anon, authenticated;
