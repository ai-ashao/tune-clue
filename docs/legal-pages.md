# Tool legal page templates

ShipLean renders Privacy Policy and Terms of Service from one typed product profile. It supports `free-local-tool` for account-free browser-local tools and `account-tool` for free tools that use accounts, usage credits, and disclosed provider processing. Product routes must stay thin wrappers around the shared renderer instead of becoming independent prose pages.

These are ordinary public product pages, not a release-state machine. Their content must describe the implemented service truthfully and remains subject to appropriate independent review.

## Configure one source of truth

Edit `src/modules/legal-profile.ts` when starting a product. The profile controls:

- product name, effective date, update date, and public URL from the same `VITE_SITE_URL` used by canonical metadata;
- the default `support@domain` contact address;
- processing activities that bind each data category to its purpose, legal basis, retention rule, and recipients;
- browser storage, infrastructure providers, international processing language, and optional consent-gated analytics.

The Privacy and Terms routes both consume this profile through `LegalDocumentPage`. Do not duplicate their section JSX or write unrelated legal prose directly in route files.

## Publishing and indexing

Legal pages do not have `starter` or `reviewed` states and do not gate a deployment. `validateLegalProfile(profile)` checks the structure and consistency of their public facts as part of the normal test suite.

Privacy and Terms are registered as ordinary public pages. Their effective robots metadata and sitemap membership follow the site-wide indexing switch in `src/lib/site-indexing.ts`. TuneClue currently keeps that switch off, so every page emits `noindex,nofollow`, `robots.txt` disallows crawling, and the sitemap is empty.

## Supported product boundary

The `free-local-tool` template assumes the product is free, has no production accounts, does not accept payment, does not publish user content, and does not upload or persist the primary tool inputs. The `account-tool` template may describe Google authentication, append-only usage credits, temporary browser resume storage, and a short sample sent to a recognition provider. Neither template represents payments, subscriptions, published user content, or general cloud file storage.

Subscriptions, paid credits, payment refunds, user content, cloud file storage, and SaaS-specific consumer terms require corresponding truthful additions before those features are published.

## Localization

The site currently ships one real English legal version. Do not publish `hreflang` or a language switch for untranslated legal pages. When a translation is added, register it under the existing stable `privacy` or `terms` page identity and render the same shared legal component with a structurally complete locale dictionary.
