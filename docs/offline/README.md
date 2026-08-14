# Offline documentation

Docs for Custosell's IndexedDB-backed offline layer. Code lives in `src/renderer/app/store/offline/` - see that folder's [README.md](../../src/renderer/app/store/offline/README.md) for the source tree map.

## Read order

1. **[architecture.md](./architecture.md)** - system design, IDB stores, reconnect pipeline ([diagram notebook](./architecture-diagram.ipynb) - supplementary mermaid)
2. **[auth.md](./auth.md)** - device login, silent upgrade, 401 gating
3. Domain modules (as needed):
   - [sales.md](./sales.md) - POS, shifts, refunds
   - [inventory.md](./inventory.md) - products, categories, customers, stock
   - [expenses.md](./expenses.md) - expenses + categories
   - [settings.md](./settings.md) - roles, staff, business settings
   - [guide.md](./guide.md) - guide feedback queue
4. **[testing.md](./testing.md)** - manual test matrix
5. **[readiness.md](./readiness.md)** - operational assessment for boutiques

## Related

- App UI during offline: [../app/shell.md](../app/shell.md)
- Service worker (web only): [../app/service-worker.md](../app/service-worker.md)
- Change history: [changelog.md](./changelog.md)
- Future npm extraction: [../future-work/offline-npm-library.ipynb](../future-work/offline-npm-library.ipynb)
