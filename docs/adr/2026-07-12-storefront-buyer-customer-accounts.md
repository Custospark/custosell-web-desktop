# ADR: Storefront buyer accounts → seller customers

**Date:** 2026-07-12  
**Status:** Accepted  
**Scope:** Frontend Discover auth + Backend register / place-order customer attach

## Context

Discover shoppers needed an easy create-account path without becoming merchants. Orders already stored `storefront_buyer_user_id` but never created a seller-scoped `Customer`.

## Decision

1. `POST /auth/register` accepts `account_type=storefront_buyer` → User with `business_id=null`, `modules=[]`, **no Shift**.
2. Login/register skip Shift creation when `business_id` is null.
3. Migration: `customers.user_id` nullable FK + unique `(business_id, user_id)`.
4. `CustomerContactService::attachStorefrontBuyer` on `OrderService::createFromStorefront` sets `order.customer_id`.
5. Discover UI: create-account default (`StorefrontAuthPanel`); never link shoppers to business `/register`.

## Consequences

- Sellers see storefront buyers in Customers after the first order.
- Repeat orders reuse the same Customer row for that buyer+shop.
- Merchant onboarding remains `POST /businesses/register`.
