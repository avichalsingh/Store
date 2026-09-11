# RHYTHM

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
