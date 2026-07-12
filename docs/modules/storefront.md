# Public storefront module

Consumer-facing shops and Discover — not B2B Marketplace.

## URLs

| Path | Purpose |
|------|---------|
| `/discover` | Lists enabled shops + listed products (search `q`; category filter is product-only) |
| `/@{slug}` | Business public shop + guest cart |

`PublicRoute` allows `/discover` and `/@…` while logged in (Settings → Open shop / signed-in testing). Landing, Pricing, Privacy, Login, and Register still redirect authenticated users.

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

## Public APIs (no auth)

| Method | Path |
|--------|------|
| GET | `/storefront/discover?q=&category=` |
| GET | `/storefront/shops?q=` |
| GET | `/storefront/categories` |
| GET | `/storefront/{slug}` |
| GET | `/storefront/{slug}/products` |
| POST | `/storefront/{slug}/orders` (rate-limited) |

## Staff fulfillment

Orders page shows **Online** badge for `source=storefront`, guest phone with tel/WhatsApp links. Complete the order into a sale as with held POS orders (no stock reserved until sale).
