# Public storefront module

Consumer-facing shops and Discover — not B2B Marketplace.

## Buyer journey

Same path for public visitors and logged-in users (Discover shell):

1. **Shops** strip / tab → progressive shop catalog (`DiscoverShopsBrowse`); client-side search.
2. **Products** strip / tab → progressive cross-shop products (`DiscoverProductsBrowse`); compact tiles; client-side search.
3. Catalogs stay **warm in React Query** (prefetch + layout warmup, 10 min stale / 1 h gc) so Shops ↔ Products and return-from-shop feel instant.
4. Open a shop → compact product grid + Add to that shop’s bag.
5. **Cart** hub → one bag per business; submit one bag at a time. Logged-in buyers auto-fill name/phone from profile.
6. **Orders** → My Orders list (same React Query cache as the strip badge total). Placing an order refetches that cache so the list and count stay aligned. **Eye** opens line items (PO/IO-style). After a shop completes/invoices the sale, buyers open **Receipt** / **Invoice** / **Payments** via existing `ReceiptPreviewModal` and `ViewInvoiceModal` (`role="storefront_buyer"`). Receipt and invoice letterheads show the **shop business name** (not Custosell); invoice **View/Download PDF** uses `GET /storefront/my-orders/{id}/invoice/pdf` — see ADR [storefront-buyer-doc-letterhead](../adr/2026-07-12-storefront-buyer-doc-letterhead.md).
7. **Delivery contact** → Name/phone saved to `custosell.storefront.buyerContact.v1` and to the buyer `User.phone` on place-order so reorders prefill; still editable in the delivery modal.
7. Guests **create an account** (default) or sign in via header **Account**, Orders, or the cart bag when placing an order — no business setup. They become that shop’s customer on order.
7b. **Your carts** line qty uses Sales-style circular red (−) / green (+) and tap-to-edit quantity.
8. **Wishlist** → Heart on product tiles/detail saves for later (`/discover/wishlist`). Device-local; merges into account list on sign-in. Header heart badge + account menu. See ADR [storefront-wishlist](../adr/2026-07-12-storefront-wishlist.md).

Product tiles use meaningful icons by name/type (flour, software, services, etc.) instead of a generic cube.
Shops show **description, location, phone, email, and star ratings** on browse tiles and on the shop page.
Products and shops support **optimistic** star ratings (UI updates immediately; rolls back on error).
Catalog loads keep the first successful page visible if a later page fails; **Retry** refetches. Auto-fetch caps at a few pages so one bad page does not wipe Products.
Shop pages show a compact **QR code** for the public `/@slug` share URL (HashRouter-safe) with **Download PNG** (512px print-ready). Shop list cards show a proportional QR on the **right** (display only). Settings → **Public shop** also shows QR + download for stickers/posters. See ADR [storefront-qr-download](../adr/2026-07-12-storefront-qr-download.md).
Strip label stays **Shops** (never the open shop’s name). While on `/discover/shop/:slug`, Shops/Products are not highlighted; clicking them leaves the shop. The matched route always renders through **Outlet** (`DiscoverPage` / `ShopPage` / `MyOrdersPage`) so the URL and visible page stay in sync. See ADR [discover-shop-under-discover-path](../adr/2026-07-12-discover-shop-under-discover-path.md) for the blank-main / Outlet-key / shell-header bugs that were fixed.
Shops ↔ Products tabs keep **both browse panels mounted** and only toggle visibility so switches stay paint-instant.
Place-order contact: compact **Delivery** tap row (“Tap to add delivery information”) opens a modal (same idea as Sales **Add customer**) — name* / phone* / notes — so the cart list stays for line items.
Bags persist in `localStorage` (`custosell.storefront.carts.v1`). Last delivery name/phone persists separately (`custosell.storefront.buyerContact.v1`) so clearing a bag after place-order does not force re-entry. See ADR [storefront-multi-cart-submit-auth](../adr/2026-07-12-storefront-multi-cart-submit-auth.md) and [storefront-buyer-phone-and-order-eye](../adr/2026-07-12-storefront-buyer-phone-and-order-eye.md).

## App module (logged-in)

Sidebar **Discover & My Orders**:

| Path | Purpose |
|------|---------|
| `/discover` | Shops or Products (`?focus=shops|products`); product rows open `/discover/shop/:slug` |
| `/discover/my-orders` | Orders you placed as a buyer — each shop fulfills its own |
| `/discover/wishlist` | Saved-for-later items (local; merge on sign-in) |
| `/discover/shop/:slug` | In-app shop catalog (under DiscoverLayout) |

Public share URLs (QR / WhatsApp / marketing):

| Path | Purpose |
|------|---------|
| `/@{slug}` | Redirect → `/discover/shop/:slug` (`ShopShareRedirect`). Checkout = cart hub. |

`/discover`, `/discover/my-orders`, `/discover/wishlist`, and `/discover/shop/:slug` live on **DiscoverLayout outside `PublicRoute`**, so signed-in sidebar links never hit the guest-only redirect to dashboard. Landing / Pricing / Privacy / Login stay under `PublicRoute` (guests only). See ADR [discover-shop-under-discover-path](../adr/2026-07-12-discover-shop-under-discover-path.md).

Sidebar group **Discover & My Orders** is in the product tour (`sidebar-module-discover`) and is **online-only** when completely offline (greyed out via `onlineOnlyNav.ts`; banner if already on the page).

Share helpers: `src/renderer/modules/storefront/storefrontShare.ts`

Bottom strip sits inside the Marketplace-style hero chrome (not a separate slate page). **Mobile only:** header and strip use inset cards (`rounded-lg` + border) and equal-width strip chips so nav doesn’t overlap. **sm+ unchanged** from the original full-bleed glass header / strip.
Cart uses the same dock (desktop lg+) / sheet (tablet & phone) arrangement as Marketplace.
Glass panels (`marketplaceGlassPanel`) for lists and orders.
Strip: **Home · Products · Shops · Cart · Orders** — labels always visible. Logged-in **Home** / header **Dashboard** open the user’s default app route (usually dashboard). Guests **Home** opens marketing `/`. After full-page login, return to `location.state.from` when safe; otherwise dashboard. In-shell Discover sign-in stays on the current Discover route.
Cart opens hub; signed-in header shows **name** (menu with email, My orders, Dashboard/home, **Log out**). Guests see **Account**. Delivery tap-row opens a **sectioned** modal (contact / phone with Uganda dial code / notes). Cart chip **X** uses the shared confirm dialog before clearing a bag. Modals/confirm sit at `z-[20000]` / `z-[21000]` above the cart sheet.

Header lockup: logo + **Custosell** wordmark. On very narrow phones the wordmark may hide; sm+ always shows it. Extra page actions wrap under the title on mobile only. Catalog/shop/orders first paint uses centered `LoadingSkeleton` `page` variant with clear status copy.

## Business setup

Settings → Business → **Public shop** card:

- Enable shop  
- Edit username (slug)  
- Copy / WhatsApp share link  

API: `PATCH /businesses/storefront-profile`, `GET /businesses/slug-available?slug=`

## Product setup

Product edit modal → **Pricing & tax**:

- Optional **Sale discount %** (0–100). Public shop shows struck regular + sale price; place-order charges the effective sale unit price. POS till still uses regular `unit_price` in v1. See ADR [product-percent-discounts](../adr/2026-07-12-product-percent-discounts.md).

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

## Known gaps (remaining)

- MoMo / card pay on place-order (intentional later)
- Push notifications (email + in-app notify on complete/invoice is live)
- SEO/OG for `/@slug`, multi-image galleries, text reviews, wishlists, delivery slots/fees
- Hard stock reservation until sale completes (soft stock signal + place-order check only)

## Furnished this pass

Discover category chips · Online orders filter/alert on Sales → Orders · buyer cancel open / delete cancelled · stock badges · Discover online-only nav · product detail modal · self-hosted QR · Public shop logo preview · delivery address/city · buyer email/in-app notify.
