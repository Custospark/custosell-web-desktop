# Business Social Links on Storefront

Status: Accepted · 2026-08-04 · Cross-stack (frontend + backend)

## Context

Businesses need to expose their external profiles (Facebook, YouTube, Instagram, X,
TikTok, LinkedIn, WhatsApp — or any future platform) on their public `/@slug` shop.
Backend stores them in a dedicated `business_social_links` table with a **free-text**
`platform` (no enum), exposed on `GET /storefront/{slug}` as `social_links`.

## Decisions

### Server-only CRUD in Settings → Business
A new self-contained **"Social links"** card in `BusinessSettingsForm` — deliberately
**not** part of the parent form's draft/save/cancel. Each row can be **added**, **edited
(platform name + URL both editable)**, or **removed (confirm dialog)**; each call uses its
own mutations (`useUpsertBusinessSocialLink`, `useDeleteBusinessSocialLink`)
which hit the network (`networkMode: 'online'`) and invalidate `business-social-links` +
`storefrontKeys.all`. This matches Oscar's "server-only" decision: no offline queue for
a child resource (the existing offline path is for `UpdateBusinessData` fields).

- Mutations are invoked as `mutate(variables, options)` so the `onSuccess` reset actually
  runs: the add form clears and the row exits edit mode after a successful save.
- Only an **add** shows the spinner/loading on the **Add link** button; an **edit save**
  shows the spinner on that row's **Save** button (Add stays disabled, not spinning).
- Removing opens a `useConfirm` dialog (`confirmText: "Remove"`, danger variant) to guard
  against accidental clicks.
- **Many links are handled responsively:** the settings list caps at `max-h-72` and scrolls
  internally instead of stretching the card; the storefront links row is `flex-wrap` and
  takes `flex-1` (up to `max-w-lg`) so icons wrap on narrow screens while the QR stays
  `shrink-0` beside it.

- While `isCompletelyOffline` the card's controls are disabled and an amber banner
  explains links need an internet connection.
- URL input normalizes `https://` prefix if omitted; backend still validates `url`.
- Adding an existing platform **upserts** (updates its URL) rather than duplicating.

### Public shop page — links left of the QR, no download
`ShopPage.tsx` now wraps social links + QR in a responsive row: links sit **to the left
of the QR** on `sm+`, stacking above it on mobile. The **Download PNG** control was
removed from the public shop page (kept in shop settings via `StorefrontQrDownloadButton`),
since a customer scanning on their phone doesn't need to download the PNG.

### Brand glyphs (lucide removed brand icons)
lucide-react 1.x dropped `Facebook`/`Instagram`/`Twitter`/`Linkedin`/`Youtube` exports.
`ui/brandIcons.tsx` ships inline CC0 simple-icons SVG paths (`fill="currentColor"`) for
the 7 known platforms plus a `hasBrandIcon()` helper (eslint-disable for
`react-refresh/only-export-components`). Unknown/custom platforms fall back to a blue
`Globe` icon.

## Files

- `src/renderer/modules/settings/api/settings/BusinessTypes.ts` — `BusinessSocialLink`,
  `UpsertBusinessSocialLinkData`; `storefrontTypes.ts` — `StorefrontSocialLink` +
  `StorefrontShop.social_links`.
- `src/renderer/modules/settings/api/settings/BusinessQueries.ts` — `socialLinksKeys`,
  `useBusinessSocialLinks`, `useUpsertBusinessSocialLink`, `useDeleteBusinessSocialLink`.
- `src/renderer/modules/settings/ui/BusinessSocialSection.tsx` — the settings card.
- `src/renderer/modules/storefront/ShopPage.tsx` — links left of QR; removed `showDownload`.
- `src/renderer/modules/storefront/ui/StorefrontSocialLinks.tsx` + `brandIcons.tsx`.

## Failure states

- Offline → controls disabled + banner; server rejects with a toast via
  `sanitizeErrorMessage`.
- Invalid URL → backend 422 → toast (field error not inline since sections are separate).
- Duplicate platform → backend upserts; list refresh shows one row.

## Also in this pass — shop loading state

Clicking any **"Explore Offers"** action (`DiscoverShopsBrowse`, `BusinessStorefrontCard`,
`StorefrontProductDetailModal` → `ROUTES.SHOP`) mounts `ShopPage`. Its earlier guard
`shopQuery.isLoading && !shop` could be skipped because `shop` also falls back to
`productsQuery.data?.shop`, so the page could render partial/empty content while the real
shop payload was still loading. Now `ShopPage` shows a **`CustosellLoader` whenever
`shopQuery.isLoading`**, so the visitor sees the loader instead of a hang during the
shop's information/catalog fetch.
