# Custosell Frontend

Offline-first POS supporting 28 business types — retail, wholesale, restaurant, and more (React + TypeScript + Vite + Electron).

## Documentation

**Start here:** [docs/README.md](./docs/README.md)

| Area | Doc |
|------|-----|
| Offline platform | [docs/offline/architecture.md](./docs/offline/architecture.md) |
| Auth & reconnect | [docs/offline/auth.md](./docs/offline/auth.md) |
| Sales / shifts | [docs/offline/sales.md](./docs/offline/sales.md) |
| Inventory | [docs/offline/inventory.md](./docs/offline/inventory.md) |
| Testing | [docs/offline/testing.md](./docs/offline/testing.md) |
| App shell & banners | [docs/app/shell.md](./docs/app/shell.md) |
| Desktop builds | [docs/platform/desktop-release.md](./docs/platform/desktop-release.md) |
| Design system | [docs/product/design-system.md](./docs/product/design-system.md) |
| Future work (npm lib) | [docs/future-work/offline-npm-library.ipynb](./docs/future-work/offline-npm-library.ipynb) |

Offline source code index: [src/renderer/app/store/offline/README.md](./src/renderer/app/store/offline/README.md)

## Development

```bash
npm install
npm run dev:react      # Vite dev server
npm run dev            # Vite + Electron
npm run vera:fast      # Lint changed files
npx tsc -b             # Typecheck
```

## Build

```bash
npm run react:build    # Web production build
npm run build:win      # Electron Windows (see docs/platform/desktop-release.md)
```
