# CORS preflight failure on non-Chrome browsers

**Date:** 2026-07-12
**Status:** Resolved
**Impact:** Login blocked on Edge/Firefox in production - `www.` subdomain mismatch + explicit origin list

---

## What happened

Users on Edge and Firefox could not log in to `https://www.custosell.com`. The login API call to `https://api.custosell.com/api/v1/auth/login` failed with:

> Access to XMLHttpRequest from origin 'https://www.custosell.com' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.

Chrome worked fine on the same network.

---

## Root causes (two, compounding)

### 1. `www.` subdomain is a different origin

The backend `.env` had `FRONTEND_URL=https://custosell.com` (no `www.`). But the user's browser was at `https://www.custosell.com`. CORS treats `custosell.com` and `www.custosell.com` as **two completely different origins** - the `Access-Control-Allow-Origin` header must match exactly.

### 2. Explicit origin list stricter than pattern

The original `config/cors.php` used an explicit `allowed_origins` array:

```php
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:5173'),
    'null',
],
```

Chrome is more lenient with CORS validation on `localhost`-like origins. Edge and Firefox strictly enforce the spec - if the origin doesn't appear in the allowed list, the preflight `OPTIONS` request returns without an `Access-Control-Allow-Origin` header, and the browser blocks the actual request.

---

## Fix

Two changes to `Backend/config/cors.php`:

### Change 1: Production domain pattern

Added a regex pattern that matches **both** `custosell.com` and `www.custosell.com`:

```php
'allowed_origins_patterns' => [
    '/^https:\/\/(www\.)?custosell\.com$/',
],
```

This avoids the need to list every possible subdomain explicitly.

### Change 2: Development all-browser pattern

Replaced the hardcoded `localhost:5173` default with a regex pattern that matches any localhost/127.0.0.1 origin on any port:

```php
'allowed_origins_patterns' => [
    '/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/',
],
```

This ensures Vite dev server works on all browsers, not just Chrome.

### Final config

```php
'allowed_origins' => [
    env('FRONTEND_URL'),   // production origin from .env
    'null',                // Electron file:// protocol
],

'allowed_origins_patterns' => [
    '/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/',  // dev servers
    '/^https:\/\/(www\.)?custosell\.com$/',             // production (www + non-www)
],
```

---

## What to check on deploy

- `FRONTEND_URL` in the backend `.env` should be set to the **exact** frontend domain (with or without `www.` - the regex pattern handles both, but the explicit env entry avoids ambiguity)
- Run `php artisan config:clear` after pulling
- Verify the preflight `OPTIONS` response includes `Access-Control-Allow-Origin: https://www.custosell.com`

---

## Lesson

CORS `allowed_origins` with explicit values works but is brittle across browsers. Regex `allowed_origins_patterns` is more flexible and handles subdomain variants (www vs non-www) without requiring multiple env entries. Chrome's leniency on localhost masked the issue in development.
