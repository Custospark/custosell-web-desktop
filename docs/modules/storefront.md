# Public storefront module

Consumer-facing shops and Discover — not B2B Marketplace.

## App module (logged-in)

Sidebar **Discover & My Orders**:

| Path | Purpose |
|------|---------|
| `/discover` | Shops or Products (`?focus=shops|products`); product rows open that business’s `/@slug` shop |
| `/discover/my-orders` | Orders you placed as a buyer — each shop fulfills its own |

Public shop pages stay shareable outside the app chrome:

| Path | Purpose |
|------|---------|
| `/@{slug}` | Public shop + cart (RR7 route `/:shopHandle`; page strips leading `@`) |

`/discover`, `/discover/my-orders`, and `/@shop` live on **DiscoverLayout outside `PublicRoute`**, so signed-in sidebar links never hit the guest-only redirect to dashboard. Landing / Pricing / Privacy / Login stay under `PublicRoute` (guests only).

Share helpers: `src/renderer/modules/storefront/storefrontShare.ts`

Bottom strip (sticky): **App/Home · Products · Shops · Cart · Orders**.
- Logged-in **App** exits to the POS; never navigates to `/` (that bounced to dashboard).
- **Products** / **Shops** stay in the Discover shell (`?focus=products|shops`).
- Cart is per-shop; orders from different businesses go to those businesses.

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
| POST | `/storefront/{slug}/orders` | Optional (Bearer sets `storefront_buyer_user_id`) |
| GET | `/storefront/my-orders` | Sanctum |

## Staff fulfillment

Orders page shows **Online** badge for `source=storefront`, guest phone with tel/WhatsApp links. Complete the order into a sale as with held POS orders (no stock reserved until sale).
