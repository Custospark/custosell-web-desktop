# Storefront Favorite Businesses

Date: 2026-08-04

Status: Accepted

## Decision

Add a "Favorite businesses" (shops) feature to the storefront, mirroring the existing
product Wishlist. Favorites is a primary mobile bottom tab (replacing Home's slot in the
main row; Home moves into the More overflow sheet), plus a star toggle on shop tiles and
on the Shop page header.

## Context

Customers wanted a way to bookmark shops to revisit - analogous to the existing
product Wishlist (`DISCOVER_WISHLIST`). The shop catalog already had a heart-free tile
grid (`ShopTile`), a Shop page header, and a primary-tab system in `StorefrontActionStrip`
(Favorites | Products | Cart | Orders | More, 5 columns). Backend had no concept of a
business-level favorite.

## Backend

- `business_favorites` table (`user_id`, `business_id`, unique pair, cascades).
- `BusinessFavorite` model; `FavoriteService` with `list/add/remove/isFavorited/count`.
- `StorefrontController` endpoints under `/storefront/favorites` (GET/POST) and
  `DELETE /storefront/favorites/{business}`, auth sanctum + throttle.
- `publicShopPayload()` now includes `id` (additive - needed for the frontend heart to
  call add/remove by business id; does not break existing consumers).

## Frontend

- `favoriteTypes.ts` / `favoriteQueries.ts` mirror `wishlistQueries` with optimistic
  add/remove, `useFavorites`, `useFavoritesCount`, `useIsFavorited`.
- Route `DISCOVER_FAVORITES` (`/discover/favorites`) → lazy `FavoritesPage` (reuses
  `ShopTile`, sign-in gate, empty state).
- `StorefrontActionStrip`: Favorites becomes a primary mobile tab (violet Star + count
  badge); Home moves into More. Desktop strip gets a Favorites tab too.
- `FavoriteHeartButton` on `ShopTile` and the Shop page header.

## Failure states

- Guest taps star → sign-in gate (`requestSignIn`), favorite saved on success.
- Optimistic mutation rolls back on error with a toast.
- `publicShopPayload` always includes `id` for authenticated/unauthenticated shop reads;
  hearts gracefully no-op if `id` is absent.

## Open items

- ShopPage unfavorite removes the shop from the Favorites page list but keeps the Shop
  page open (heart shows unfavorited state immediately via query cache).
