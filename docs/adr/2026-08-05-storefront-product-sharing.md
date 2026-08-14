# Storefront Product Sharing - Public Deep Links

Date: 2026-08-05
Status: Implemented

## Goal

Let a customer share a **specific product** in a storefront to a friend via a
public deep link - just like the existing `@slug` shop share links, but pointing
straight at one product instead of the whole catalog.

## Decisions (confirmed with Oscar via selectables)

1. **Identity** - the **product slug** (auto-generated from the product name;
   users never type or choose it).
2. **Scope** - links are **shop-scoped** (`/@slug/p/<productSlug>`); the same
   product-slug only resolves inside its owning shop.
3. **Affordance** - **copy-link button only** in the product detail modal.
4. **Guests** - **yes, public**. Already-issued shop links and QR codes are
   unaffected.

## URL Contract

| Purpose | Path | Target |
|---------|------|--------|
| In-app product page | `/discover/shop/:slug?product=<productSlug>` | `ShopPage` opens the product modal |
| Public share link | `/@slug/p/<productSlug>` | `ShopShareRedirect` → the in-app page above |
| API (single product) | `GET /storefront/{slug}/products/{productSlug}` | public payload, listed + active only |

Back-compat: `/@slug` still routes to `/discover/shop/:slug` and the QR / WhatsApp
shop links are unchanged.

## Backend (`custosell-core-api`)

- Migration `2026_08_05_000000_add_product_slug_for_storefront_sharing`: nullable
  `products.slug` (after `sku`) with a unique `(business_id, slug)` index; backfills
  existing rows via chunked `Str::slug(name)` with suffix disambiguation.
- `Product`: `slug` in `$fillable`; `static makeUniqueSlug(businessId, name, ignoreId)`
  (falls back to `product`, appends numeric suffix until business-unique).
- `ProductService`: sets `slug` on create; regenerates only when the **name changes**
  (and the caller did not pass an explicit slug). Slug is stable otherwise.
- `StorefrontBrowseConcern::findListedProductForShop(...)`: scoped to business,
  `listed_for_storefront`, `is_active`, matched by `slug`.
- `StorefrontController::product(...)` + route `/{slug}/products/{productSlug}`:
  resolves the enabled shop, then the product; 422 when not found/unlisted.
- `publicProductPayload` now includes `slug` so the client can build share links.

## Frontend (`custosell-web-desktop`)

- `ROUTES.SHOP_PRODUCT(slug, productSlug)` and `ROUTES.SHOP_PRODUCT_SHARE(slug, productSlug)`.
- `storefrontShareUrl(slug, productSlug?)` builds `/@slug` or `/@slug/p/<productSlug>`.
- `ShopShareRedirect` parses `@slug` **or** `@slug/p/<productSlug>`; the new
  `/:shopHandle/p/:productSlug` route precedes the `/:shopHandle` catch-all.
- `ShopPage`: reads `?product=`; prefers the already-loaded catalog item, else a new
  `useStorefrontShopProduct` fetch; closes by clearing the param.
- `StorefrontProductDetailModal`: added a **Copy link** button (only when the product
  has a slug).

## Out of Scope / Notes

- The project-wide `render(RuntimeException …)` handler in `bootstrap/app.php` used to
  map API **404 → 422** (it caught `HttpException`). Fixed so `HttpException` subclasses
  (incl. `NotFoundHttpException`) glue to Laravel's real status code; `ValidationException`
  and location-limit `RuntimeException` still render 422. Product share tests assert a
  real 404, and `test_shop_404_when_storefront_disabled` now passes.