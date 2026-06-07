# Service Worker Caching Strategy

Custosell uses a custom service worker (`public/sw.js`) registered in production web builds.

| Request type | Online | Offline |
|--------------|--------|---------|
| Image / JS / CSS | **Cache-first** — serve from CacheStorage when available | **Cache-first** — serve from CacheStorage |
| API GET (`/api/v1/*`) | **Network-first** — fetch server, save response to CacheStorage | **Stale cache** — serve last cached GET response |
| API mutations (POST/PUT/PATCH/DELETE) | **Network pass-through** — go to server immediately | **Fails at network** — app saves to IndexedDB via `mutationQueue` |

## Caches

| Cache name | Contents |
|------------|----------|
| `custosell-static-v1` | JS, CSS, images, fonts, SPA shell (`index.html`) |
| `custosell-api-v1` | GET responses from `/api/v1/*` (scoped per `X-Business-Id`) |

## App-layer sync (mutations)

The service worker does **not** queue mutations. Offline writes are handled in the renderer:

- `mutationQueue` (IndexedDB) — outbound POST/PUT/PATCH/DELETE
- `localSalesStore` — offline sale records
- `syncEngine` — batch sync on reconnect

## Registration

- **Production web:** `registerServiceWorker()` in `main.tsx`
- **Electron:** skipped (`file://` — uses bundled assets + IndexedDB)
- **Vite dev:** skipped (assets served from memory)

## Logout

`clearServiceWorkerApiCache()` clears the API cache on logout and 401 to prevent cross-user data leakage.

## Testing

```bash
npm run react:build
npx serve dist/web -l 3000
```

Open `http://localhost:3000`, use the app online once, then go offline in DevTools.
