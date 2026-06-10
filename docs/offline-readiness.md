# Offline readiness — boutique operations

Assessment for shops in **unreliable internet** environments using Custosell as a single-till POS.

## Suitable for (launch now)

- Single-location boutique / small retail
- Cash + mobile money + occasional card (recorded, not terminal-integrated)
- One primary till device (phone, tablet, laptop, Electron desktop)
- Staff who can recognize “Pending sync” as normal while offline
- Owner who can open the app briefly online once per day to refresh snapshots

## Not yet suitable for

- Multi-till real-time stock across devices
- Payment terminal / STK push integration as core flow
- Chain / franchise with centralized live inventory
- Full offline PDF reporting suite
- Zero onboarding (“must sign in online once on device”)

## Day-to-day capability matrix

| Task | Offline | Notes |
|------|---------|-------|
| Ring up sales | Yes | Instant when fully offline; up to ~4s wait when “slow” |
| Print receipt (browser) | Yes | `window.print` / print styles |
| Clock in / out shift | Yes | Local shift ID until sync |
| Refund synced sale | Yes | `OFF-*` sales must sync first |
| View sales history | Yes* | *Requires prior online snapshot or same-session cache |
| My Shift totals | Yes | Merges local sales + shift snapshot |
| Dashboard today | Yes | Server baseline + pending overlay |
| Products / categories CRUD | Yes | Queued sync |
| Customers CRUD | Yes | Snapshot + queue |
| Expenses + receipts | Yes | Receipt upload queued |
| Roles / staff / business settings | Yes | See [offline-settings.md](./offline-settings.md) |
| Profile / password | No | Online only |
| Quick report PDF download | No | Online only |
| Low-stock API alerts | No | Use product list + ledger locally |

## Connectivity behavior staff should know

| Situation | What happens |
|-----------|----------------|
| **Fully offline** | Sales complete immediately; red banner; data safe in IndexedDB |
| **Internet returns** | Silent login upgrade; background sync; badges clear when done |
| **Slow / flickering** | App tries server first — may feel slower than fully offline |
| **Sync failed badge** | Server rejected item — edit and correct (products/staff documented) |

## Recommended daily playbook

1. **Morning (brief online window)** — Open app, let catalogs load, clock in if using shifts.
2. **Trading hours** — Sell normally; ignore connection if checkout works.
3. **Reconnect** — Stay in app; let sync finish before logging out elsewhere.
4. **End of day** — End shift (online preferred); review pending sync badges.

## Competitive positioning (offline usability)

| Comparison | Approx. score / 100 |
|------------|---------------------|
| vs cloud-first POS (Square-class) offline | ~78 |
| vs offline-aware POS (Loyverse-class) | ~65 |
| **Custosell boutique single-till** | **~72** |

Architecture is strong; gaps vs market leaders: slow-network UX, multi-device stock, hardware/payment ecosystem, years of field hardening.

## High-impact follow-ups

1. Treat flaky/slow connections like offline for **sales** (shorter server wait).
2. Shift list catalog snapshots.
3. Multi-device stock conflict warnings.
4. Field pilots (3–5 real shops) before broad marketing.
