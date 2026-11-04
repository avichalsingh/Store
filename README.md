# PRAGVI

Premium digital storefront for AI-generated character dance videos.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Lucide icons

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm start` — serve production build
- `npm run lint` — ESLint
- `npm run catalog:export-prod` — read-only Production catalogue export
- `npm run catalog:import-staging` — Staging import (**dry-run by default**)
- `npm run catalog:copy-previews` — copy `media-previews` objects only (**dry-run by default**)

## Production → Staging catalogue transfer

Safe, repeatable workflow to copy **catalogue** data (not customers, orders, or payments) from Production into the separate `pragvi-staging` Supabase project. Product/character IDs are preserved.

### What is copied

Tables (in order): `characters` → `products` → `collections` → `collection_products` → `collection_character_rules` → `product_relationships` → `media_assets`.

Storage (optional second step): referenced objects in **`media-previews` only**. **`media-masters` are never copied** by these scripts.

### What is never copied

`auth.users`, orders, order_items, payment_events, entitlements, secrets, or master downloadable files.

### Environment setup

Use two separate env files (both gitignored via `.env*`):

| File | Purpose |
|------|---------|
| `.env.local` | Production URL + service role (export / preview source) |
| `.env.staging` | Staging URL + service role (import / preview destination) |

Required names in each file:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional: `CATALOG_PRODUCTION_PROJECT_REF` (production project ref) as an extra guard for import.

**Never** point `.env.staging` at Production. Import aborts if staging and production project refs match.

### Staging permissions prerequisite

Staging `service_role` needs table GRANTs on catalogue tables (commerce grants alone are not enough). Migration prepared (not auto-applied):

`supabase/migrations/20261104000000_staging_catalog_service_role_grants.sql`

Apply **only** to `pragvi-staging` after explicit approval (`npx supabase db push` while linked to staging). Do **not** apply to Production without a separate decision.

### 1) Read-only export (Production)

```bash
mkdir -p artifacts/catalog
node scripts/catalog-export-prod.mjs --env-file .env.local --out artifacts/catalog/prod-export.json
```

Writes a manifest under `artifacts/catalog/` (gitignored). Review `counts`, `media.previewObjectCount`, and `media.unresolvedOrForeignSupabaseRefs` before importing.

### 2) Dry-run import (default — no writes)

```bash
node scripts/catalog-import-staging.mjs --env-file .env.staging --in artifacts/catalog/prod-export.json
```

Reports planned inserts, ID conflicts, and URL rewrite stats. Aborts on:

- staging ref == production ref
- unresolved Production Supabase URLs that would leave Staging dependent on Production
- existing staging rows with the same IDs (no silent overwrite)

### 3) Dry-run preview copy (default — no storage writes)

```bash
node scripts/catalog-copy-previews.mjs --in artifacts/catalog/prod-export.json --prod-env .env.local --staging-env .env.staging
```

### 4) Execute only after human approval

```bash
# After staging catalogue grants are applied and dry-runs look correct:
node scripts/catalog-import-staging.mjs --env-file .env.staging --in artifacts/catalog/prod-export.json --execute
node scripts/catalog-copy-previews.mjs --in artifacts/catalog/prod-export.json --prod-env .env.local --staging-env .env.staging --execute
```

### 5) Verify Staging

- `catalog_products` / `catalog_characters` row counts match expected actives
- Spot-check that media URLs use the **staging** Supabase host (not Production)
- Confirm downloads still require auth + entitlements (no masters copied)

### Avoid targeting Production

- Export reads `.env.local`; import defaults to `.env.staging`
- Import compares project refs and refuses same-project or prod-as-staging
- No script uses `--execute` by default
- Masters bucket is rejected if it appears in the preview copy list

## Project structure

```
src/
  app/                 # Pages (home, explore, characters, videos, collections, account, checkout)
  components/
    layout/            # Site shell
    navigation/        # Navbar, Footer
    home/              # Homepage sections
    products/          # Video cards, filters, preview
    characters/        # Character & category cards
    collections/       # Collection cards
    cart/              # Cart drawer
    ui/                # Shared UI primitives
  context/             # Cart provider (localStorage)
  data/                # Mock characters, videos, collections
  types/               # Shared TypeScript types
  lib/                 # Utilities
```

## What’s included

- Discovery-focused homepage with hero, trending, characters, categories, featured collection
- Explore page with client-side search, filters, and sort
- Character pages with accent-driven identity
- Video product detail pages
- Collection / pack pages with savings
- Working cart drawer persisted to `localStorage`
- Account library placeholder
- Checkout placeholder (ready for Stripe / Razorpay)

## Next for production

1. Auth (Supabase / Clerk / Auth.js)
2. Database for catalog + purchases
3. Real vertical video assets + CDN
4. Payment provider + webhook fulfillment
5. Secure download / library delivery
6. Admin CMS for characters and releases
