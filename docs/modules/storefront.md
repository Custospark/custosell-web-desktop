# Public storefront module

Consumer-facing shops and Discover — not B2B Marketplace.

## Buyer journey

Same path for public visitors and logged-in users (Discover shell):

1. **Shops** strip / tab → progressive shop catalog (`DiscoverShopsBrowse`); client-side search.
2. **Products** strip / tab → progressive cross-shop products (`DiscoverProductsBrowse`); compact tiles; client-side search.
3. Catalogs stay **warm in React Query** (prefetch + layout warmup, 10 min stale / 1 h gc) so Shops ↔ Products and return-from-shop feel instant.
4. Open a shop → compact product grid + Add to that shop’s bag.
5. **Cart** hub → one bag per business; submit one bag at a time. Logged-in buyers auto-fill name/phone from profile.
6. **Orders** → My Orders list (same React Query cache as the strip badge total). Placing an order refetches that cache so the list and count stay aligned.
7. Guests sign in via header, Orders, or inline cart fields when placing an order.

Product tiles use meaningful icons by name/type (flour, software, services, etc.) instead of a generic cube.
Shops show **description, location, phone, email, and star ratings** on browse tiles and on the shop page.
Products and shops support **optimistic** star ratings (UI updates immediately; rolls back on error).
Catalog loads keep the first successful page visible if a later page fails; **Retry** refetches. Auto-fetch caps at a few pages so one bad page does not wipe Products.
Shop pages show a compact **QR code** for the public `/@slug` share URL (HashRouter-safe). Shop list cards show a proportional QR on the **right**.
Strip label stays **Shops** (never the open shop’s name). While on `/discover/shop/:slug`, Shops/Products are not highlighted; clicking them leaves the shop. The matched route always renders through **Outlet** (`DiscoverPage` / `ShopPage` / `MyOrdersPage`) so the URL and visible page stay in sync. See ADR [discover-shop-under-discover-path](../adr/2026-07-12-discover-shop-under-discover-path.md) for the blank-main / Outlet-key / shell-header bugs that were fixed.
Shops ↔ Products tabs keep **both browse panels mounted** and only toggle visibility so switches stay paint-instant.
Place-order contact fields (name*, phone*, notes) stay visible and editable; signed-in buyers get them prefilled from profile.
Bags persist in `localStorage` (`custosell.storefront.carts.v1`). See ADR [storefront-multi-cart-submit-auth](../adr/2026-07-12-storefront-multi-cart-submit-auth.md).

## App module (logged-in)

Sidebar **Discover & My Orders**:

| Path | Purpose |
|------|---------|
| `/discover` | Shops or Products (`?focus=shops|products`); product rows open `/discover/shop/:slug` |
| `/discover/my-orders` | Orders you placed as a buyer — each shop fulfills its own |
| `/discover/shop/:slug` | In-app shop catalog (under DiscoverLayout) |

Public share URLs (QR / WhatsApp / marketing):

| Path | Purpose |
|------|---------|
| `/@{slug}` | Redirect → `/discover/shop/:slug` (`ShopShareRedirect`). Checkout = cart hub. |

`/discover`, `/discover/my-orders`, and `/discover/shop/:slug` live on **DiscoverLayout outside `PublicRoute`**, so signed-in sidebar links never hit the guest-only redirect to dashboard. Landing / Pricing / Privacy / Login stay under `PublicRoute` (guests only). See ADR [discover-shop-under-discover-path](../adr/2026-07-12-discover-shop-under-discover-path.md).

Sidebar group **Discover & My Orders** is in the product tour (`sidebar-module-discover`) and is **online-only** when completely offline (greyed out via `onlineOnlyNav.ts`; banner if already on the page).

Share helpers: `src/renderer/modules/storefront/storefrontShare.ts`

Bottom strip sits inside the Marketplace-style hero chrome (not a separate slate page).
Cart uses the same dock (desktop lg+) / sheet (tablet & phone) arrangement as Marketplace.
Glass panels (`marketplaceGlassPanel`) for lists and orders.
Strip: **Home · Products · Shops · Cart · Orders** — labels always visible. Logged-in **Home** / header **Dashboard** open the user’s default app route (usually dashboard). Guests **Home** opens marketing `/`. After full-page login, return to `location.state.from` when safe; otherwise dashboard. In-shell Discover sign-in stays on the current Discover route.
Cart opens hub; Orders / header **Sign in** open email+password dialog.
Guest checkout shows **inline email + password** in the cart bag (“Sign in & place order”).

Header lockup: logo + **Custosell** wordmark. Catalog/shop/orders first paint uses centered `LoadingSkeleton` `page` variant with clear status copy.

## Business setup

Settings → Business → **Public shop** card:

- Enable shop  
- Edit username (slug)  
- Copy / WhatsApp share link  

API: `PATCH /businesses/storefront-profile`, `GET /businesses/slug-available?slug=`

## Product setup

Product edit modal → **Public shop**:

- Upload image (`POST /products/{id}/image`)  
- List on shop (`PATCH /products/{id}/storefront-listing`)  

## Public APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/storefront/discover?q=&category=` | No |
| GET | `/storefront/shops?q=` | No |
| GET | `/storefront/categories` | No |
| GET | `/storefront/{slug}` | No |
| GET | `/storefront/{slug}/products` | Optional Sanctum (includes `my_rating`) |
| POST | `/storefront/{slug}/ratings` | Sanctum (shop 1–5 stars, upsert) |
| POST | `/storefront/{slug}/products/{id}/ratings` | Sanctum (1–5 stars, upsert per user) |
| POST | `/storefront/{slug}/orders` | Sanctum (sets `storefront_buyer_user_id`) |
| GET | `/storefront/my-orders` | Sanctum |

Shop public payload includes `description`, `address`, `city`, `state`, `country`, `business_phone`, `business_email`.
Product public payload includes `rating_avg`, `rating_count`, `my_rating`.

## Staff fulfillment

Orders page shows **Online** badge for `source=storefront`, guest phone with tel/WhatsApp links. Complete the order into a sale as with held POS orders (no stock reserved until sale).
