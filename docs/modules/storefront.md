# Public storefront module

Consumer-facing shops and Discover — not B2B Marketplace.

## Buyer journey

Same path for public visitors and logged-in users (Discover shell):

1. **Browse** Shops or Products (`?focus=shops|products`, warm cache / `staleTime` 60s).
2. **Open a shop** (`/@slug`) → Add to that shop’s bag (multi-cart).
3. **Cart hub** (strip Cart) → one bag per business; submit one bag at a time.
4. **Sign in** only when placing an order (humble email/password dialog; no POS redirect).
5. **My Orders** — each shop fulfills its own order.

Bags persist in `localStorage` (`custosell.storefront.carts.v1`). See ADR [storefront-multi-cart-submit-auth](../adr/2026-07-12-storefront-multi-cart-submit-auth.md).

## App module (logged-in)

Sidebar **Discover & My Orders**:

| Path | Purpose |
|------|---------|
| `/discover` | Shops or Products (`?focus=shops|products`); product rows open that business’s `/@slug` shop |
| `/discover/my-orders` | Orders you placed as a buyer — each shop fulfills its own |

Public shop pages stay shareable outside the app chrome:

| Path | Purpose |
|------|---------|
| `/@{slug}` | Public shop catalog (RR7 route `/:shopHandle`; page strips leading `@`). Checkout = cart hub. |

`/discover`, `/discover/my-orders`, and `/@shop` live on **DiscoverLayout outside `PublicRoute`**, so signed-in sidebar links never hit the guest-only redirect to dashboard. Landing / Pricing / Privacy / Login stay under `PublicRoute` (guests only).

Share helpers: `src/renderer/modules/storefront/storefrontShare.ts`

Bottom strip sits inside the Marketplace-style hero chrome (not a separate slate page).
Cart uses the same dock (desktop lg+) / sheet (tablet & phone) arrangement as Marketplace.
Glass panels (`marketplaceGlassPanel`) for lists and orders.
Strip: **App/Home · Products · Shops · Cart · Orders** — labels always visible; Cart opens hub; Orders / header **Sign in** open email+password dialog.
Guest checkout shows **inline email + password** in the cart bag (“Sign in & place order”).

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
| GET | `/storefront/{slug}/products` | No |
| POST | `/storefront/{slug}/orders` | Sanctum (sets `storefront_buyer_user_id`) |
| GET | `/storefront/my-orders` | Sanctum |

## Staff fulfillment

Orders page shows **Online** badge for `source=storefront`, guest phone with tel/WhatsApp links. Complete the order into a sale as with held POS orders (no stock reserved until sale).
