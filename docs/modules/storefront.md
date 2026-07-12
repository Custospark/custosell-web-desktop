# Public storefront module

Consumer-facing shops and Discover — not B2B Marketplace.

## App module (logged-in)

Sidebar **Discover & My Orders**:

| Path | Purpose |
|------|---------|
| `/discover` | Marketplace-style browse: inline shop list + dense product rows (no modal) |
| `/discover/my-orders` | Orders you placed as a buyer (Sales → Orders chrome) |

Public shop pages stay shareable outside the app chrome:

| Path | Purpose |
|------|---------|
| `/@{slug}` | Public shop + cart (RR7 route `/:shopHandle`; page strips leading `@`) |

`PublicRoute` allows `/@…` while logged in. Discover lives under the authenticated app Layout (sidebar).

Share helpers: `src/renderer/modules/storefront/storefrontShare.ts`

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
