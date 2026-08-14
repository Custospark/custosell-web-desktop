# ADR — Service worker serves static assets network-first (never cache-first online)

- **Date:** 2026-08-14
- **Status:** Accepted
- **Version:** 5.2.0
- **Stack:** Frontend (service worker `public/sw.js`) + server `.htaccess`

## Context

Production (and staging) intermittently hit:

```
Uncaught SyntaxError: The requested module './user-plus-ed_YL5Ph.js' does not
provide an export named 't' (at index-*.js:2:3257)
```

Investigation showed the **build was always internally consistent** — `index.html`
referenced chunk hashes that all existed in the same `dist/web` folder. The error
came from **stale service-worker caching**: `sw.js` served JS/CSS **cache-first**,
so a browser holding an old SW (and its cached old chunks) kept resolving a new
entry chunk's imports against **old hashed chunk files** — a mixed build in the
browser's cache.

Two things amplified it:

1. **`sw.js` itself was HTTP-cached** for a month (`application/javascript
   "access plus 1 month"` in `.htaccess`), so the browser kept the old SW (and its
   cache-first behavior) long after a new build shipped.
2. **Inconsistent manual deploys** (`cp -r src/* dest/` without wiping the
   destination, and bash `*` not matching dotfiles) left mixed folders on the
   server — new `index.html` alongside old/missing chunks — which the cache-first
   SW then served.

Earlier versions (≤ 4.0.0) used a hardcoded `CACHE_VERSION = 'v1'` + cache-first
but "worked" only because deploys happened to be consistent, so stale caches still
resolved to real matching files. An intermediate attempt in 5.1.0 stamped a unique
`CACHE_VERSION` per build; that was not the actual fix and was reverted.

## Decision

Make the service worker **network-first** for static assets, and ensure the SW and
HTML shell are never HTTP-cached:

### 1. Network-first static (`public/sw.js`)

Replace `cacheFirst` with `networkFirstStatic` for JS/CSS/images/fonts:

- **Online:** always fetch from the server → users get the current build's chunks
  every time.
- **Offline:** fall back to the cache (keeps the offline-first loading/push
  capability intact).

Content-hashed assets are immutable, so performance is preserved via the browser's
HTTP cache (`Cache-Control: public, max-age=31536000, immutable`); the SW no longer
serves them from its own cache when online.

### 2. Never HTTP-cache `sw.js` or `index.html` (`.htaccess`)

```apache
<FilesMatch "sw\.js$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
</FilesMatch>
<FilesMatch "index\.html$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
</FilesMatch>
```

So every load revalidates the SW (a new SW activates and purges old caches via the
`activate` handler) and fetches a fresh shell that references the current build's
hashes — even a browser still on an old SW cannot resolve a stale chunk mix.

### 3. Force SW updates (`registerServiceWorker.ts`)

- Register with `updateViaCache: 'none'`.
- Call `registration.update()` on page load and whenever the tab becomes visible.

### 4. `CACHE_VERSION`

Kept at the v4 baseline `'v1'`. The per-build timestamp stamping was removed — it
was not the fix. Network-first is the fix; version stamping may be reintroduced
later purely as an offline-cache-purge optimization, but never with cache-first.

### 5. Consistent deploys

The deploy flow must wipe + recopy (`rm -rf` + `cp -rT`) so the server folder is
always a single consistent build. Bash `*` does not match dotfiles, so `cp -rT`
is required to carry `.htaccess`.

## Why not drop the service worker

The SW is required for:
- loading the app completely offline (offline-first POS/Sales flows),
- web push notifications (backend `webpush` feature),
- offline stale API GET responses.

Network-first keeps all of that while eliminating stale-chunk errors online.

## Consequences

- Online users always receive the latest build; no `does not provide an export`
  errors.
- Offline loading and push notifications still work (cache is an offline fallback
  only).
- A user still on an old SW self-heals on their next load (fresh shell + fresh
  SW → new SW activates → purges old caches). Worst case is one stale load during
  the transition, which is eliminated once the fresh `index.html` is fetched.
- Staging (`staging.custosell.com`) and production (`custosell.com`) are
  independent — separate origins, SW scopes, and caches — so staging issues never
  affect production.

## References

- `public/sw.js` — `networkFirstStatic`, `CACHE_VERSION = 'v1'`
- `src/renderer/app/sw/registerServiceWorker.ts` — `updateViaCache: 'none'`,
  forced `registration.update()`
- `deploy/htaccess.staging` — no-cache for `sw.js` and `index.html`, immutable for
  hashed assets
- `scripts/deploy-to-backend.mjs` — consistent wipe + copy (`cp -rT`)
