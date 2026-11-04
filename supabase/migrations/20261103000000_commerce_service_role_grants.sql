-- Stage 3: service_role table privileges for commerce tables.
-- DO NOT apply to production without explicit approval.
--
-- Context:
-- - 20261028000000 creates orders/order_items/payment_events/entitlements,
--   enables RLS, grants SELECT to authenticated, and grants EXECUTE on
--   fulfill_paid_order to service_role.
-- - Direct DML from Next.js API routes (create-order, verify-payment,
--   webhooks, download entitlement checks) also needs table-level GRANTs
--   for service_role. RLS bypass alone is not sufficient.
--
-- Fresh installs: apply this migration after 20261028000000.
-- Already applied manually: these GRANT statements are idempotent — safe
-- to record in migration history without changing effective privileges.
--
-- Required privileges (all four tables): SELECT, INSERT, UPDATE, DELETE.
-- Additive only. No schema changes.

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.order_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.entitlements TO service_role;

COMMIT;
