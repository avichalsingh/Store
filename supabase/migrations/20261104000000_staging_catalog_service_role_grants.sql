-- Staging-oriented: service_role DML on catalogue tables.
-- DO NOT apply to production without explicit separate approval.
--
-- Context (pragvi-staging):
-- - Commerce service_role grants already exist via
--   20261103000000_commerce_service_role_grants.sql
-- - Catalogue tables (characters, products, collections, joins,
--   product_relationships, media_assets) currently deny service_role SELECT,
--   which blocks catalogue import tooling that uses the service role key.
--
-- This migration is additive GRANT only. It does not change RLS policies,
-- does not grant to anon/authenticated beyond existing Phase A grants,
-- and does not touch auth or commerce customer data tables.
--
-- Why service_role needs table GRANTs:
-- - PostgREST still requires privilege GRANTs even though service_role
--   bypasses RLS. Without them, catalogue export/import scripts fail with
--   permission denied for table products (etc.).
--
-- Idempotent: re-running GRANT is safe.

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.characters TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.collections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.collection_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.collection_character_rules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_relationships TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.media_assets TO service_role;

COMMIT;
