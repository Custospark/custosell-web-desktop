# ADR: Public storefront shops

**Date:** 2026-07-12  
**Status:** Accepted (implemented)  
**Scope:** Public `/@slug` shops + Discover; guest unpaid order requests into POS Orders

## Context

Businesses need shareable links for TikTok / WhatsApp / Facebook so customers can browse products and request orders without logging into Custosell. This is a **consumer** channel — separate from B2B Marketplace (`listed_for_supply`).

## Decisions

1. Reuse business **`slug`** as public username (`/@slug`).
2. Opt-in: `storefront_enabled` on business; `listed_for_storefront` + optional `image_path` on products.
3. Checkout = **order request** (name, phone, items, notes) — no online payment in v1. **Sign-in required** at submit (see [storefront-multi-cart-submit-auth](./2026-07-12-storefront-multi-cart-submit-auth.md)).
4. Orders land in existing **Orders** queue with `source=storefront`, attributed to business owner; buyer linked via `storefront_buyer_user_id`.
5. Landing **Discover** (`/discover`) searches across listed shops by category/query.

## Non-goals (v1)

- MoMo/card payment  
- Delivery address / time slots  
- Multi-image galleries  
- Conflating with Marketplace POs  

## Failure states

| Case | Behaviour |
|------|-----------|
| Shop disabled / bad slug | Public 404 |
| Unlisted product in cart | 422 on submit |
| Spam | `throttle:storefront-orders` |
| Staff offline | Orders appear when app is online |

## Related

- [../modules/storefront.md](../modules/storefront.md)  
- Marketplace ADR remains B2B-only
