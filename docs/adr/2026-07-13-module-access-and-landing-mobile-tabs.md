# ADR: Module Access tiles and landing mobile tab bar

**Date:** 2026-07-13  
**Status:** Accepted

## Context

Settings → Module access used plain checkboxes without the Apps launcher visual language. Marketing landing on mobile crowded top links into icon-only chips without a native app feel.

## Decision

1. **Module access** tiles reuse `MODULE_LAUNCHER_CATALOG` icons, tones, and short descriptions with toggle switches (`OwnerModuleTile`). Settings remains required; estimates/HR full-workspace options keep dedicated depth cards.
2. **Landing mobile** uses a fixed bottom tab bar (Home, Discover, Pricing, Privacy) with clear labels. Top nav links move to `md+` only. Route changes scroll to top. Discover keeps its own storefront chrome after navigate.

## Key files

- `src/renderer/modules/settings/ui/OwnerModuleAccessForm.tsx`
- `src/renderer/modules/settings/ui/OwnerModuleTile.tsx`
- `src/renderer/modules/landing/LandingLayout.tsx`
- `src/renderer/modules/landing/ui/LandingMobileTabBar.tsx`
- `src/renderer/shared/components/layout/moduleLauncherCatalog.ts`
