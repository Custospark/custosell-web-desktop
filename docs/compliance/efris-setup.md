# URA EFRIS - sandbox / pilot credentials setup

**Product decisions:** [ADR 2026-07-12 EFRIS fiscalization](../adr/2026-07-12-efris-fiscalization.md)  
**Backend config:** `Backend/config/efris.php` ← reads from `.env`  
**Master switch:** `EFRIS_ENABLED=false` means Custosell does **not** use EFRIS at all.

Official URA pages (verify if URLs move):

- [EFRIS overview](https://ura.go.ug/en/efris/)
- [EFRIS registration](https://ura.go.ug/en/efris/efris-registration/)
- [EFRIS handbook / FAQ](https://ura.go.ug/en/efris-handbook/)

---

## Locked product choices (v1)

| Question | Decision |
|----------|----------|
| Where first? | **Uganda (UG) first** for EFRIS; architecture stays **country-configurable** for later regimes |
| How? | **Direct URA EFRIS API** - **not** a hardware fiscal / EFD device in v1 |
| What fiscalizes? | **Both** POS sales and sales invoices |
| Offline? | **Allow sale, sync fiscal later** (do not block checkout) |
| Credentials | You place sandbox / pilot values in **Backend `.env`** |

---

## Master flag

In `Backend/.env`:

```env
# Master switch - false = never call URA / never queue fiscal jobs
EFRIS_ENABLED=false
```

| Value | Behaviour |
|-------|-----------|
| `false` | Default. Sales and invoices work as today. No EFRIS traffic. |
| `true` | Fiscal queue + URA API path active for configured scope (POS + invoices). |

Flip to `true` only after TIN / device / keys for a **pilot business** are filled in and sandbox calls succeed.

---

## How to get sandbox / pilot credentials

URA does not publish a single “download API key” page for every taxpayer. Typical path for **system-to-system (API)** integration:

### 1. Prerequisites

1. Valid **TIN** for the pilot business (and URA portal login password).
2. Business should be (or become) set up for **EFRIS** on the URA portal.
3. Decide **e-invoicing / API** (system-to-system) - **not** EFD hardware for this Custosell path.

### 2. Register / activate EFRIS on the URA portal

1. Open [ura.go.ug](https://www.ura.go.ug) → Login.
2. Open **EFRIS** (OTP to registered email/phone as prompted).
3. If first time: **First-time registration** → choose e-invoicing / system integration (not EFD-only) → submit for URA approval.
4. Wait for URA approval before API device work.

### 3. Register a **virtual device** (DeviceNo) for API

1. In the EFRIS portal, register a **device / virtual device** for system-to-system use.
2. Note the **Device number (DSN / DeviceNo)** - maps to `EFRIS_DEVICE_NO`.
3. Register **branch** place of business if required - maps to `EFRIS_BRANCH_ID` when URA assigns one.

### 4. Certificates / keys (API encryption)

URA EFRIS API typically requires key material (public key upload + private key kept local):

1. Generate a key pair as instructed by URA / your accredited integrator docs for sandbox.
2. Upload the **public** key via the EFRIS portal (or as URA directs for API clients).
3. Store the **private** key file **outside git** (e.g. `storage/app/efris/private.pem`) and point `EFRIS_PRIVATE_KEY_PATH` at it.
4. Keep `EFRIS_PUBLIC_KEY_PATH` if you retain a local copy of the uploaded public cert.

Exact T-codes (T102/T103 auth, invoice submit, etc.) will live in the EFRIS client implementation; this doc only covers **obtaining** credentials.

### 5. Sandbox vs production URLs

| Env | Typical host | `.env` |
|-----|----------------|--------|
| Sandbox / test | `https://efristest.ura.go.ug` | `EFRIS_ENVIRONMENT=sandbox` |
| Production | `https://efrisws.ura.go.ug` | `EFRIS_ENVIRONMENT=production` |

Confirm the current hosts with URA before go-live - they can change.

### 6. Fill Backend `.env`

Copy from `.env.example` (EFRIS section). Example for a pilot:

```env
EFRIS_ENABLED=false
EFRIS_COUNTRY=UG
EFRIS_MODE=api
EFRIS_FISCALIZE_POS=true
EFRIS_FISCALIZE_INVOICES=true
EFRIS_OFFLINE_MODE=sync_later
EFRIS_ENVIRONMENT=sandbox
EFRIS_BASE_URL=https://efristest.ura.go.ug
EFRIS_TIN=1000123456
EFRIS_DEVICE_NO=
EFRIS_BRANCH_ID=
EFRIS_API_USERNAME=
EFRIS_API_PASSWORD=
EFRIS_PRIVATE_KEY_PATH=
EFRIS_PUBLIC_KEY_PATH=
```

Then set `EFRIS_ENABLED=true` when ready to test against sandbox.

### 7. Safety

- Never commit real TIN passwords, API passwords, or private keys.
- Prefer OS file permissions on key paths; do not paste PEMs into chat or tickets.
- Keep `EFRIS_ENABLED=false` on shared/dev machines that are not the pilot.

---

## Where code reads this

```php
config('efris.enabled');           // master switch
config('efris.mode');              // 'api' (v1)
config('efris.scope.pos_sales');
config('efris.scope.sales_invoices');
config('efris.offline');           // 'sync_later'
config('efris.tin');
// …
```

---

## Implementation status (shipped)

| Piece | Status |
|-------|--------|
| `EfrisClient` + `EfrisService` | Shipped - no-op when `EFRIS_ENABLED=false` |
| Hook: `SaleService::create` | Shipped - never blocks checkout |
| Hook: `InvoiceService::send` | Shipped - never blocks send |
| Jobs | `FiscalizeSaleJob` / `FiscalizeInvoiceJob` with backoff retries |
| Persistence | `fiscal_status`, `fiscal_fdn`, `fiscal_qr`, `fiscal_verification_code`, payload/response, `fiscalized_at`, `fiscal_last_error` |
| Safe status | `GET /api/v1/efris/status` → `{ enabled, configured, country, environment, … }` |
| Frontend | Fiscal chips on sale complete / history / invoice view; receipt FDN/QR; Tax page EFRIS panel |
| Offline POS | Local `fiscal_status=pending` hint; after batch sync, cache uses server fiscal fields |

### Queue worker (required when enabled)

```bash
cd Backend
php artisan queue:work
```

Without a worker, sales still succeed; fiscal rows stay `pending` / `failed` until jobs run.

### Failure UX

| Case | Behaviour |
|------|-----------|
| Flag off | Columns stay `none`; Tax page shows Disabled |
| Offline / URA error | Sale kept; chip shows Fiscal pending / Fiscal failed; job retries |
| Enabled but missing TIN/keys | No fake FDN; `failed` + Tax page **Misconfigured** |
