# ADR: Storefront QR download

**Date:** 2026-07-12  
**Status:** Accepted  
**Scope:** Discover shop QR + Public shop settings

## Context

Merchants need a printable QR for posters, stickers, and table tents. QR was display-only on the shop page and Discover cards; Public shop settings had copy/WhatsApp but no QR.

## Decision

1. `StorefrontQrCode` accepts `showDownload`. When true, **Download PNG** fetches a 512×512 image of the `/@slug` share URL and saves `{slug}-shop-qr.png`.
2. Enable download on **Shop page** and **Settings → Sales channels** (Public shop card). Discover shop cards stay display-only.
- Keep the lightweight `api.qrserver.com` image endpoint (no new npm dependency). Toast on success/failure.

## Update (same day)

Superseded by self-hosted `qrcode` package in `StorefrontQrCode` - see [storefront-polish-gaps](./2026-07-12-storefront-polish-gaps.md). Download PNG still ships from settings + shop page.
