# Custosell - Monetization Strategy

## Current Phase: Pre-PMF (Product-Market Fit)

**Status:** Free for all users. No payment gates, no subscriptions, no billing.

**Goal:** Maximize adoption, gather usage data, and identify what features users actually need and value.

---

## Phase 1: Launch & Learn (Now - 3 Months)

| Action | Why |
|--------|-----|
| Keep the app completely free | Remove all friction to adoption |
| Track feature usage | Which features are used most? Where do users spend time? |
| Collect feedback | What would users pay for? What's missing? |
| Build core reliability | Offline-first, data integrity, performance |
| No payment infrastructure | Zero engineering time on billing |

**Success metric:** X active businesses, Y sales processed, Z returning users.

---

## Phase 2: Introduce Monetization (3 - 6 Months)

**Approach:** Simple, low-friction model - no complex subscription management.

### Option A: Feature-Gated (Recommended)
```
Free Tier:
  - Up to 100 sales/month
  - 1 cashier/staff account
  - Basic reporting

Pro Tier ($X/month):
  - Unlimited sales
  - Multi-user (up to 5 staff)
  - Advanced reporting & exports
  - Priority support
```

### Option B: Usage-Based
```
Free:
  - Full features
  - Pay-per-transaction above threshold
  - E.g., free for first 500 sales/month, then small fee per additional sale
```

### Payment Methods (for Uganda/Africa)
- **Mobile Money** (MTN MoMo, Airtel Money) - dominant in Uganda
- **Card payments** (via Flutterwave or Paystack)
- **Bank transfers** (manual approval for enterprise)

### Approval Flow
1. User selects plan and pays via mobile money or card
2. Auto-approval for card/mobile money (instant)
3. Manual approval for bank transfers (admin dashboard)
4. Subscription activated, feature gates lifted

**Engineering effort:** 2-3 weeks for a basic Paystack/Flutterwave integration with webhook handling.

---

## Phase 3: Full Subscription Management (6 - 12 Months)

| Feature | Description |
|---------|-------------|
| Self-service billing portal | Users upgrade/downgrade/cancel plans |
| Auto-renewals | Monthly billing via saved payment method |
| Dunning emails | Automated reminders before card expiry |
| Invoicing | PDF invoices for accounting |
| Multi-currency pricing | UGX, USD, KES, TZS per business region |
| Team/Enterprise plans | Custom pricing for 10+ staff |

**Engineering effort:** 4-6 weeks for full subscription infrastructure.

---

## Principles

1. **Never break offline-first.** Payment verification should never block the core POS flow.
2. **Grandfather early users.** First 100 users get lifetime free access - they're your best marketers.
3. **Price for Uganda, then expand.** UGX 30,000-50,000/month (~$8-$12) is the sweet spot for Ugandan SMEs.
4. **Let users pay how they want.** Mobile money first, card second, bank transfer third.
5. **Make it easy to leave.** No lock-in. Export data anytime. Trust is the currency before money.

---

## What NOT to Do

| Don't | Why |
|-------|-----|
| Paywall before value | Users won't pay until they depend on the product |
| Complex pricing tiers | Analysis paralysis kills conversion |
| Annual contracts upfront | Monthly is standard for SMEs |
| Ignore mobile money | In Uganda, mobile money > card payments 10:1 |
| Build subscriptions before product-market fit | Biggest waste of engineering time |
