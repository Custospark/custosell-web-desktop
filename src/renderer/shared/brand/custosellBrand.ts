/** Custosell product brand — single source for tagline / lockups (Phase 1 Business OS). */

export const PRODUCT_NAME = 'Custosell';

/** Primary tagline (UI, auth, footer). */
export const TAGLINE = 'Your Business Operating System';

/** Short lockup where space is tight. */
export const TAGLINE_SHORT = 'Business OS';

/** Document / OG title: "Custosell — Your Business Operating System" */
export const DOCUMENT_TITLE = `${PRODUCT_NAME} — ${TAGLINE}`;

/** Compact shell line: "Custosell — Your Business Operating System" */
export const BRAND_LOCKUP = `${PRODUCT_NAME} — ${TAGLINE}`;

/**
 * Hero / auth supporting sentence — keep in sync with Backend `config/brand.php`
 * (`supporting_line`).
 */
export const SUPPORTING_LINE =
  'Custosell is your Business Operating System — Point of Sale (POS), E-commerce Storefront, Inventory & Supply Chain, Accounting, HR & Payroll, Invoicing, Expenses, Project Management, Sales Pipeline (CRM), Financial Forecasting, and Document Management — all in one connected system that works with or without the internet.';

/**
 * Search-engine meta description (meta[name=description], og:description,
 * twitter:description). Keep under ~160 chars so search engines use it
 * verbatim instead of falling back to landing-page body text (e.g. the
 * marketplace copy). Keep in sync with Frontend `index.html` <head> and
 * Backend `config/brand.php` (`seo_description`).
 */
export const SEO_DESCRIPTION =
  'Custosell is your Business Operating System — Point of Sale, E-commerce, Inventory, Accounting, HR & Payroll, Invoicing and CRM in one connected system that works with or without the internet.';

/**
 * Canonical product landing URL used for SEO (og:url, canonical link).
 * Keep in sync with Backend `config/brand.php` (`url`).
 */
export const SEO_URL = 'https://www.custosell.com';

/**
 * Custospark Company Ltd — support / seller contact details.
 * Keep in sync with Backend `config/brand.php` (company_* keys) and
 * `src/renderer/modules/guide/guideSupportConfig.ts` (full phone list).
 */
export const COMPANY_NAME = 'Custospark Company Ltd';
export const COMPANY_URL = 'https://www.custospark.com';
export const SUPPORT_EMAIL = 'support@custosell.com';
export const SUPPORT_PHONE = '+256 756 697 871';
export const SUPPORT_WHATSAPP = '256756697871';
