# ADR: Module Access tiles and landing mobile tab bar

**Date:** 2026-07-13  
**Status:** Accepted

## Context

Settings → Module access used plain checkboxes without the Apps launcher visual language. Marketing landing on mobile crowded top links into icon-only chips without a native app feel.

## Decision

1. **Module access** tiles reuse `MODULE_LAUNCHER_CATALOG` icons, tones, and short descriptions with toggle switches (`OwnerModuleTile`). Settings is always on for owners (locked Required badge, not toggleable); backend `normalizeOwnerModules` also re-injects `settings`. Save is disabled until the selection differs from the saved profile (dirty check). Layout is responsive: 1 → 2 → 3 columns, sticky mobile save bar with safe-area inset.
2. **Landing mobile** uses a fixed bottom tab bar (Home, Discover, Pricing, Privacy) with bold always-visible labels and a solid white bar. Top nav links move to `md+` only. Navbar CTA is **Account** (opens Sign In). Sign-in page shows a clear **Create Account** button for new users. Discover storefront strip uses short mobile labels (Products, Businesses, …) so text stays readable. Route changes scroll to top.

## Key files

- `src/renderer/modules/settings/ui/OwnerModuleAccessForm.tsx`
- `src/renderer/modules/settings/ui/OwnerModuleTile.tsx`
- `src/renderer/modules/landing/LandingLayout.tsx`
- `src/renderer/modules/landing/ui/LandingMobileTabBar.tsx`
- `src/renderer/shared/components/layout/moduleLauncherCatalog.ts`
