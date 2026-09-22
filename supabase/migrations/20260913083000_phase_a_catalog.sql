-- Phase A: Core catalog schema for RHYTHM Store
-- Matches Admin CMS TypeScript models (src/admin/types.ts, src/catalog/productPayloads.ts).
-- Does NOT include media storage, auth profiles, orders, entitlements, homepage, campaigns, or tools.
--
-- Public catalog reads go through views that omit/sanitize paid/private payloads.
-- Direct table access for writes (and full reads) is admin-only via is_admin().

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'True when JWT app_metadata.role = admin. No admin users exist until Phase C auth wiring.';

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. characters  (AdminCharacter)
-- ---------------------------------------------------------------------------

CREATE TABLE public.characters (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  image text NOT NULL DEFAULT '',
  short_bio text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  accent_color text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'hidden', 'archived')),
  featured boolean NOT NULL DEFAULT false,
  show_on_characters_page boolean NOT NULL DEFAULT true,
  page_headline text,
  page_intro text,
  -- Soft refs (no FK): avoid circular deps with products/collections; CMS may point at drafts.
  featured_product_id text,
  featured_collection_id text,
  show_products_on_page boolean,
  show_collections_on_page boolean,
  -- Derived counts kept for CMS parity (updated by app on save).
  product_count integer NOT NULL DEFAULT 0,
  collection_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT characters_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS characters_status_idx ON public.characters (status);
CREATE INDEX IF NOT EXISTS characters_featured_idx ON public.characters (featured)
  WHERE featured = true;

DROP TRIGGER IF EXISTS characters_set_updated_at ON public.characters;
CREATE TRIGGER characters_set_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.characters IS 'AdminCharacter — CMS source of truth.';

-- ---------------------------------------------------------------------------
-- 2. products  (AdminProduct + type payloads)
-- ---------------------------------------------------------------------------

CREATE TABLE public.products (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  product_type text NOT NULL
    CHECK (product_type IN ('VIDEO', 'AI_IMAGE', 'PROMPT', 'CAPTION_PACK', 'BUNDLE')),
  character_id text REFERENCES public.characters (id) ON DELETE SET NULL,
  -- Denormalized display name from CMS (optional for non-character types).
  character_name text,
  category text NOT NULL DEFAULT '',
  -- Denormalized membership mirror of collection_products (CMS AdminProduct.collectionIds).
  -- Join table collection_products is the relational source of truth for queries.
  collection_ids text[] NOT NULL DEFAULT '{}',
  short_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  is_trending boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,

  -- Soft ref until Phase B media_assets table exists.
  media_asset_id text,
  -- AdminProductMedia: { thumbnail, previewVideo?, downloadFileName?, downloadFileSize? }
  media jsonb NOT NULL DEFAULT '{"thumbnail":""}'::jsonb,
  thumbnail_mode text CHECK (thumbnail_mode IS NULL OR thumbnail_mode IN ('frame', 'custom')),
  watermark_mode text CHECK (watermark_mode IS NULL OR watermark_mode IN ('global', 'custom')),
  watermark_override jsonb,
  preview_quality text
    CHECK (preview_quality IS NULL OR preview_quality IN ('standard', 'optimized', 'high')),

  -- AdminProductPricing: { INR: { regularPrice, currentPrice }, USD: { ... } }
  pricing jsonb NOT NULL DEFAULT '{"INR":{"regularPrice":0,"currentPrice":0},"USD":{"regularPrice":0,"currentPrice":0}}'::jsonb,
  -- AdminOfferConfig
  offer jsonb NOT NULL DEFAULT '{"enabled":false,"label":""}'::jsonb,
  -- AdminPerformanceMetrics
  performance jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- AdminCreatorActivity
  creator_activity jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- AdminProductCampaign (per-product promo block, not AdminCampaign entity)
  campaign jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- AdminAvailability
  availability jsonb NOT NULL DEFAULT '{"mode":"unlimited"}'::jsonb,

  -- Video-leaning flat fields (kept for CMS backward compatibility).
  duration text NOT NULL DEFAULT '',
  resolution text NOT NULL DEFAULT '',
  format text NOT NULL DEFAULT '',
  access text NOT NULL DEFAULT '',

  licenses jsonb NOT NULL DEFAULT '[]'::jsonb,
  pdp_value_cards jsonb,
  file_details jsonb,

  sales integer NOT NULL DEFAULT 0,
  revenue_inr numeric NOT NULL DEFAULT 0,

  -- Type-specific payloads (full CMS JSON). Private fields must NOT be exposed via anon.
  prompt_data jsonb,
  caption_pack_data jsonb,
  ai_image_data jsonb,
  bundle_data jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS products_status_idx ON public.products (status);
CREATE INDEX IF NOT EXISTS products_product_type_idx ON public.products (product_type);
CREATE INDEX IF NOT EXISTS products_character_id_idx ON public.products (character_id);
CREATE INDEX IF NOT EXISTS products_is_featured_idx ON public.products (is_featured)
  WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS products_is_trending_idx ON public.products (is_trending)
  WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS products_media_asset_id_idx ON public.products (media_asset_id)
  WHERE media_asset_id IS NOT NULL;

DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.products IS
  'AdminProduct — full CMS row including private prompt/caption/ai payloads.';
COMMENT ON COLUMN public.products.prompt_data IS
  'PromptData JSON. Contains mainPrompt (private) + publicTeaser/canGenerate (public).';
COMMENT ON COLUMN public.products.caption_pack_data IS
  'CaptionPackData JSON { items[] }. Full captions/hashtags are paid/private.';
COMMENT ON COLUMN public.products.ai_image_data IS
  'AiImageData JSON. images[].url may be master; prefer previewUrl for public.';
COMMENT ON COLUMN public.products.bundle_data IS
  'BundleData JSON (includedProductIds, cover fields). Safe for public merchandising.';
COMMENT ON COLUMN public.products.media_asset_id IS
  'Soft ref to future media_assets.id (Phase B). No FK in Phase A.';

-- ---------------------------------------------------------------------------
-- 3. collections  (AdminCollection)
-- ---------------------------------------------------------------------------

CREATE TABLE public.collections (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  cover_image text NOT NULL DEFAULT '',
  cover_mode text NOT NULL DEFAULT 'auto'
    CHECK (cover_mode IN ('auto', 'single', 'collage', 'custom')),
  -- Soft ref until Phase B.
  cover_media_id text,
  cover_auto_source text
    CHECK (cover_auto_source IS NULL OR cover_auto_source IN ('first', 'popular', 'random')),
  cover_product_id text REFERENCES public.products (id) ON DELETE SET NULL,
  cover_layout text,
  -- CollectionCoverSlot[]: [{ slotIndex, productId? }]
  cover_slots jsonb,
  cover_custom_url text,
  sort_mode text NOT NULL DEFAULT 'custom'
    CHECK (sort_mode IN (
      'custom', 'newest', 'popular', 'engagement', 'price-asc', 'price-desc'
    )),
  pricing jsonb,
  offer jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('active', 'draft')),
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collections_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS collections_status_idx ON public.collections (status);
CREATE INDEX IF NOT EXISTS collections_featured_idx ON public.collections (featured)
  WHERE featured = true;

DROP TRIGGER IF EXISTS collections_set_updated_at ON public.collections;
CREATE TRIGGER collections_set_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.collections IS 'AdminCollection — CMS source of truth.';

-- ---------------------------------------------------------------------------
-- 4. collection_products  (AdminCollection.productIds[])
-- ---------------------------------------------------------------------------

CREATE TABLE public.collection_products (
  collection_id text NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS collection_products_product_id_idx
  ON public.collection_products (product_id);
CREATE INDEX IF NOT EXISTS collection_products_collection_sort_idx
  ON public.collection_products (collection_id, sort_order);

COMMENT ON TABLE public.collection_products IS
  'M:N membership; sort_order preserves AdminCollection.productIds array order.';

-- ---------------------------------------------------------------------------
-- 5. collection_character_rules  (AdminCollection.characterRules[])
-- ---------------------------------------------------------------------------

CREATE TABLE public.collection_character_rules (
  collection_id text NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  character_id text NOT NULL REFERENCES public.characters (id) ON DELETE CASCADE,
  include_existing_products boolean NOT NULL DEFAULT true,
  automatically_include_future_products boolean NOT NULL DEFAULT false,
  PRIMARY KEY (collection_id, character_id)
);

CREATE INDEX IF NOT EXISTS collection_character_rules_character_id_idx
  ON public.collection_character_rules (character_id);

COMMENT ON TABLE public.collection_character_rules IS
  'CMS auto-include rules; not required for public storefront reads.';

-- ---------------------------------------------------------------------------
-- 6. product_relationships  (AdminProduct.relationships[])
-- ---------------------------------------------------------------------------

CREATE TABLE public.product_relationships (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  related_product_id text NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  relationship_type text NOT NULL
    CHECK (relationship_type IN (
      'ADD_ON', 'RELATED', 'RECOMMENDED', 'INCLUDED_IN_BUNDLE'
    )),
  sort_order integer NOT NULL DEFAULT 0,
  custom_price_inr numeric,
  custom_price_usd numeric,
  CONSTRAINT product_relationships_no_self_ref
    CHECK (product_id <> related_product_id)
);

CREATE INDEX IF NOT EXISTS product_relationships_product_id_idx
  ON public.product_relationships (product_id);
CREATE INDEX IF NOT EXISTS product_relationships_related_product_id_idx
  ON public.product_relationships (related_product_id);
CREATE INDEX IF NOT EXISTS product_relationships_type_idx
  ON public.product_relationships (product_id, relationship_type, sort_order);

COMMENT ON TABLE public.product_relationships IS
  'Cross-product links (add-ons, related, recommended, bundle includes).';

-- ---------------------------------------------------------------------------
-- Public catalog views (sanitize / omit private payloads)
-- Anon + authenticated may SELECT these. Base product private columns stay admin-only.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.catalog_characters
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  slug,
  image,
  short_bio,
  description,
  accent_color,
  status,
  featured,
  show_on_characters_page,
  page_headline,
  page_intro,
  featured_product_id,
  featured_collection_id,
  show_products_on_page,
  show_collections_on_page,
  product_count,
  collection_count,
  created_at,
  updated_at
FROM public.characters
WHERE status = 'active'
  AND show_on_characters_page = true;

COMMENT ON VIEW public.catalog_characters IS
  'Public characters (active + show_on_characters_page), matching storefront filter.';

CREATE OR REPLACE VIEW public.catalog_collections
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  slug,
  description,
  cover_image,
  cover_mode,
  cover_media_id,
  cover_auto_source,
  cover_product_id,
  cover_layout,
  cover_slots,
  cover_custom_url,
  sort_mode,
  pricing,
  offer,
  status,
  featured,
  created_at,
  updated_at
FROM public.collections
WHERE status = 'active';

-- security_invoker = false: view owner reads base products (bypasses RLS) then
-- projects only sanitized columns. Required because anon must not SELECT products directly.
CREATE OR REPLACE VIEW public.catalog_products
WITH (security_invoker = false)
AS
SELECT
  p.id,
  p.name,
  p.slug,
  p.product_type,
  p.character_id,
  p.character_name,
  p.category,
  p.collection_ids,
  p.short_description,
  p.description,
  p.tags,
  p.status,
  p.is_trending,
  p.is_featured,
  p.media_asset_id,
  -- Public media fields only: drop download filename/size hints from payload.
  jsonb_strip_nulls(
    jsonb_build_object(
      'thumbnail', p.media -> 'thumbnail',
      'previewVideo', p.media -> 'previewVideo'
    )
  ) AS media,
  p.thumbnail_mode,
  p.watermark_mode,
  p.preview_quality,
  p.pricing,
  p.offer,
  p.performance,
  p.creator_activity,
  p.campaign,
  p.availability,
  p.duration,
  p.resolution,
  p.format,
  p.access,
  p.licenses,
  p.pdp_value_cards,
  p.file_details,
  p.sales,
  -- Admin/business revenue metric intentionally not projected.
  -- Private payloads omitted / replaced with public slices:
  CASE
    WHEN p.prompt_data IS NULL THEN NULL
    ELSE jsonb_strip_nulls(
      jsonb_build_object(
        'publicTeaser', p.prompt_data -> 'publicTeaser',
        'canGenerate', p.prompt_data -> 'canGenerate',
        'sectionCount', p.prompt_data -> 'sectionCount'
      )
    )
  END AS prompt_data,
  -- Caption packs: expose item count + labels only (no caption text / hashtags).
  CASE
    WHEN p.caption_pack_data IS NULL THEN NULL
    ELSE jsonb_build_object(
      'itemCount', coalesce(jsonb_array_length(p.caption_pack_data -> 'items'), 0),
      'styleLabels', coalesce(
        (
          SELECT jsonb_agg(DISTINCT item ->> 'label')
          FROM jsonb_array_elements(
            coalesce(p.caption_pack_data -> 'items', '[]'::jsonb)
          ) AS item
          WHERE nullif(trim(item ->> 'label'), '') IS NOT NULL
        ),
        '[]'::jsonb
      )
    )
  END AS caption_pack_data,
  -- AI images: keep merchandising JSON but strip images[].url (possible master).
  CASE
    WHEN p.ai_image_data IS NULL THEN NULL
    ELSE (
      (p.ai_image_data - 'images')
      || jsonb_build_object(
        'images',
        coalesce(
          (
            SELECT jsonb_agg(
              jsonb_strip_nulls(
                jsonb_build_object(
                  'id', img -> 'id',
                  'previewUrl', img -> 'previewUrl',
                  'fileName', img -> 'fileName',
                  'sizeLabel', img -> 'sizeLabel',
                  'isCover', img -> 'isCover',
                  'mediaAssetId', img -> 'mediaAssetId'
                )
              )
              ORDER BY ordinality
            )
            FROM jsonb_array_elements(
              coalesce(p.ai_image_data -> 'images', '[]'::jsonb)
            ) WITH ORDINALITY AS t(img, ordinality)
          ),
          '[]'::jsonb
        )
      )
    )
  END AS ai_image_data,
  p.bundle_data,
  p.created_at,
  p.updated_at
FROM public.products p
WHERE p.status = 'active';

COMMENT ON VIEW public.catalog_products IS
  'Active products with private prompt/caption/master fields removed or sanitized for anon.';

-- Definer views: joining products would fail under invoker RLS for anon.
CREATE OR REPLACE VIEW public.catalog_collection_products
WITH (security_invoker = false)
AS
SELECT cp.collection_id, cp.product_id, cp.sort_order
FROM public.collection_products cp
INNER JOIN public.collections c ON c.id = cp.collection_id
INNER JOIN public.products p ON p.id = cp.product_id
WHERE c.status = 'active'
  AND p.status = 'active';

CREATE OR REPLACE VIEW public.catalog_product_relationships
WITH (security_invoker = false)
AS
SELECT
  r.id,
  r.product_id,
  r.related_product_id,
  r.relationship_type,
  r.sort_order,
  r.custom_price_inr,
  r.custom_price_usd
FROM public.product_relationships r
INNER JOIN public.products p ON p.id = r.product_id
INNER JOIN public.products related ON related.id = r.related_product_id
WHERE p.status = 'active'
  AND related.status = 'active';

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public-safe base tables: anon may SELECT (RLS still filters rows).
-- Required for catalog_characters / catalog_collections (security_invoker = true).
GRANT SELECT ON public.characters TO anon, authenticated;
GRANT SELECT ON public.collections TO anon, authenticated;

-- CMS write privileges for authenticated; RLS restricts to is_admin().
GRANT INSERT, UPDATE, DELETE ON public.characters TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_character_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_relationships TO authenticated;

-- Deny anon on private/join tables (defense in depth; RLS also admin-only).
REVOKE ALL ON public.products FROM anon;
REVOKE ALL ON public.collection_products FROM anon;
REVOKE ALL ON public.collection_character_rules FROM anon;
REVOKE ALL ON public.product_relationships FROM anon;

-- Public catalog via views (anon + authenticated).
GRANT SELECT ON public.catalog_characters TO anon, authenticated;
GRANT SELECT ON public.catalog_collections TO anon, authenticated;
GRANT SELECT ON public.catalog_products TO anon, authenticated;
GRANT SELECT ON public.catalog_collection_products TO anon, authenticated;
GRANT SELECT ON public.catalog_product_relationships TO anon, authenticated;

-- Function privileges
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- RLS — base tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_character_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_relationships ENABLE ROW LEVEL SECURITY;

-- characters
DROP POLICY IF EXISTS characters_admin_all ON public.characters;
CREATE POLICY characters_admin_all
  ON public.characters
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Public may read active+listed characters directly (no private payloads on this table).
DROP POLICY IF EXISTS characters_public_select ON public.characters;
CREATE POLICY characters_public_select
  ON public.characters
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND show_on_characters_page = true);

-- products: NO anon SELECT on base table (would expose private JSONB).
-- Public reads must use catalog_products view. Admin full access only.
DROP POLICY IF EXISTS products_admin_all ON public.products;
CREATE POLICY products_admin_all
  ON public.products
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- collections
DROP POLICY IF EXISTS collections_admin_all ON public.collections;
CREATE POLICY collections_admin_all
  ON public.collections
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS collections_public_select ON public.collections;
CREATE POLICY collections_public_select
  ON public.collections
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- collection_products: admin only on base table.
-- Public reads use catalog_collection_products (security definer view).
DROP POLICY IF EXISTS collection_products_admin_all ON public.collection_products;
CREATE POLICY collection_products_admin_all
  ON public.collection_products
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- collection_character_rules: admin only (CMS rules, not storefront catalog).
DROP POLICY IF EXISTS collection_character_rules_admin_all ON public.collection_character_rules;
CREATE POLICY collection_character_rules_admin_all
  ON public.collection_character_rules
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- product_relationships: admin only on base table.
-- Public reads use catalog_product_relationships (security definer view).
DROP POLICY IF EXISTS product_relationships_admin_all ON public.product_relationships;
CREATE POLICY product_relationships_admin_all
  ON public.product_relationships
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
