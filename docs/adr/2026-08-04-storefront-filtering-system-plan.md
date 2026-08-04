# Storefront Filtering System — Implementation Plan

Date: 2026-08-04
Status: Approved (decision) — not yet implemented

## Goal

Replace "scroll everything" with a robust, server-backed filter system for discovering
businesses and products: business category, location (country + city), product type,
effective price, in-stock, minimum rating, and sorting — all with live facet counts and
URL-addressable state. No endless scrolling through irrelevant results.

## Decisions (confirmed with Oscar)

1. **Business taxonomy** — new curated `business_categories` table (seeded), optional
   `businesses.business_category_id`, category picker in Settings → Business profile.
2. **Location** — country + city facet dropdowns (multi-country capable, derived from
   live data with counts).
3. **Product filters** — type (product/service), effective-price range, in-stock,
   minimum rating, plus sort (relevance/newest/price_asc/price_desc/rating/name).
4. **Filter state** — URL search params (shareable, survives refresh/back).

## Backend

### Data model
- Table `business_categories` (`id, slug unique, name, sort_order`), seeded with ~15
  curated categories. New `CategorySeeder`.
- Migration `add business_category_id` nullable FK on `businesses` (null = uncategorized;
  still visible under All).
- `Business` relation `businessCategory()`. `publicShopPayload` gains
  `category: {slug, name} | null`.
- Business profile update path accepts optional `business_category_id` (validated, must
  exist; nullable).

### Service methods (`StorefrontService`)
- `discoverShops(q, category?, city?, country?, sort?, viewerUserId?, perPage)`
  - `category` → match `business_category_id` by slug (or id).
  - `city` / `country` → case-insensitive, trimmed exact match.
  - `sort` → `name` (default) | `newest` (`created_at` desc) | `rating`.
- `discoverProducts(q, category?, business_category?, type?, priceMin?, priceMax?,
  inStock?, minRating?, city?, country?, sort?, viewerUserId?, perPage)`
  - `category` = product category (unchanged).
  - `business_category` = the business's `business_category_id` (slug).
  - `price` range against effective price: `COALESCE(sale_price, unit_price)`.
  - `sort` → `relevance` | `newest` (`storefront_listed_at` desc) | `price_asc`
    | `price_desc` (effective price) | `rating`.
- `shopProducts(...)` accepts `type, priceMin, priceMax, inStock, minRating, sort`.
- **Facets** — new `discoverFacets(viewerUserId?)` returning:
  ```json
  {
    "business_categories": [{ "slug", "name", "count" }],
    "locations": {
      "countries": [{ "name", "count" }],
      "cities": [{ "name", "count" }]
    },
    "product_types": [{ "value": "product|service", "name", "count" }],
    "price": { "min", "max" }
  }
  ```
  All counts under `publicStorefront()` visibility gates (storefront_enabled + status).

### Routes (`routes/api/v1/storefront.php`)
- `GET /storefront/facets` — public, no auth, no throttle (read-only facets).
- Extend existing `GET /discover`, `GET /shops`, `GET /{slug}/products` to accept the
  new query params. Public, unauthenticated.

## Frontend

### Types & API
- `StorefrontShop` gains `category?: {slug, name} | null`.
- New `StorefrontFacets` type.
- `fetchShopsPage`, `fetchDiscoverPage`, `fetchShopProductsPage` accept an options object
  (category/location/type/price/in_stock/rating/sort) instead of growing positional args.
- New `useStorefrontFacets()` + query key `facets()`.

### Query keys (extend tuples, `storefrontQueryKeys.ts`)
- `shopsPages(q, category, city, country, sort)`
- `discoverPages(productCategory, businessCategory, type, priceMin, priceMax,
  inStock, minRating, city, country, sort, q)`
- `productsPages(slug, productCategory, type, priceMin, priceMax, inStock, minRating, sort, q)`
- `facets()`
- Key change resets pagination to page 1 (React Query behavior — preserved).

### Filter state = URL search params
- `DiscoverPage`, browse panels, and `ShopPage` read filters from `useSearchParams`
  (alongside existing `?focus=`).
- A small `storefrontFilters` util (serialize/parse/clear; no duplicate `focus`).

### UI
- New shared `StorefrontFilterBar`:
  - business-category chip/sheet, country + city dropdowns, product-type toggle,
    price range, in-stock + rating controls, sort dropdown (context-appropriate set).
  - **Active-filter pills** row with individual remove + "Clear all".
  - **Results count** (`total` from meta) replaces the unbounded feed perception.
- `DiscoverShopsBrowse`: category chips + location + sort.
- `DiscoverProductsBrowse`: product category chips (existing) + business category +
  location + type/price/stock/rating + sort.
- `ShopPage`: product subset filters + sort.
- Empty state "No businesses/products match these filters." + **Clear all filters** CTA
  (when a filter is active) — no endless scroll.
- Facets fetch failure → filter controls hide gracefully; `q` search + default list
  still work.

## Failure states (coverage)
- Zero results under filters → clear-filters empty state (never a dead scroll).
- Facets unavailable → hide filters, keep results.
- Debounce + filter change → key change resets to page 1.
- Location casing/whitespace mismatch → server trims + case-insensitive match; cities
  derive from stored values so they align.
- Price always uses effective price (sale-aware) server + FE display consistent.
- Public browse stays unauthenticated; favorites/ratings/orders unaffected.
- Pagination under filters: offset-based, bounded by per_page cap; no duplicates; end
  indicated via meta + "Show more…".

## Verification (Nora) & gates
- Backend: `composer vera:fast`; FE: `npx tsc --noEmit` + `npm run vera:fast`.
- Smoke matrix: category/location/type/price/stock/rating/sort individually and combined
  (2+) on shops, discover, shop products; pagination page 2 under filters; no duplicates;
  zero-result empty state; facets counts == filtered totals; sale-price price filter;
  unauthenticated browse.

## Doc impact
- ADR `2026-08-04-storefront-filtering-system.md`; update docs index; note in
  `modules/storefront.md`.

## Rollout phases (each gated: vera + tsc + commit/push both repos)
1. Backend: business_categories migration + seeder + model + relationship +
   business_category_id + settings save.
2. Backend: StorefrontService filter params + facets endpoint + payload category field.
3. Frontend: types + fetch param objects + facets hook + query keys.
4. Frontend: FilterBar + URL-state util + wire browse pages/shops/shop + empty states.
5. Docs + full QA gates.