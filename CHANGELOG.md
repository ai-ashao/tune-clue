# Changelog

## Unreleased

- Added SEO-first Tool Mode handoff through a typed Tool SEO Brief containing primary keyword, search intent, first-batch page map, locales, and research evidence.
- Disabled starter Guides by default, removed them from primary navigation and sitemap, and added a residue gate that blocks indexable Guides while ShipLean starter guide slugs remain.
- Changed Tool Registry sitemap behavior to explicit opt-in: only `status: 'live'` plus `indexable: true` enters sitemap.
- Required `seo.primaryKeyword` on indexable Tool Landing pages while allowing QA/reference routes to declare `indexable: false`.
- Made Tool reference noindex behavior declarative through `toolPageHead(...)` instead of route-local robots duplication.
- Prevented automatic Related Tools from filling empty slots with zero-relevance live tools.
- Added multilingual keyword-intent handling: Latin token matching, CJK n-gram matching, and manual-review warnings for unsupported non-Latin scripts.
- Unified Tool-mode homepage metadata around `toolStarterConfig(...)` instead of maintaining a separate Tool metadata path.
- Added internal-link graph acceptance to HTTP E2E: broken internal links, indexable orphan pages, and homepage-unreachable pages fail; >3-click depth warns.
- Separated the product-template runtime from the ShipLean marketing website in `ai-ashao/shiplean-site`.
- Added explicit `product.mode = 'saas' | 'tool'` with mode-specific homepage composition, navigation, Header CTA rules, validation, and shared-shell routing.
- Hardened Product Modes so Pricing/App surfaces default on for SaaS and off for Tool; Guides now remain explicit opt-in.
- Added Tool Landing v0.1 and evolved it into the task-first Tool Landing v0.2 candidate.
- Added Tool Registry, Related Tools, truthful Tool Value Signals, Constraints, Completion Highlights, Capabilities, Helpful Guidance, and Tool structured data.
- Added shared Field and Select primitives plus a UI spacing contract.
- Added real-browser first-viewport acceptance at 1440×900 and 390×844.
- Enabled GitHub verification on pushes to both `main` and `dev`.
- Added focused `free-local-tool` legal templates and production review validation.
- Upgraded Vite to `7.3.6`.
- Enforced the sandbox session before rendering the dashboard and disabled caching on session responses.

## 0.2.0 - 2026-08-06

- Repositioned the MVP as an Agent-ready TanStack Start SaaS scaffold.
- Added the bundled `shiplean-quick-start` Skill and download → Agent → Skill → MVP workflow.
- Replaced the payment console with a protected starter dashboard and implementation checklist.
- Removed the SEO generator, programmatic tool pages, billing sandbox, orders, entitlements, and credits from the MVP.
- Kept baseline public-site metadata, bilingual routes, security headers, local identity boundary, Cloudflare bundle, and one-command verification.

Production auth, PostgreSQL, payments, email, storage, and account-backed Cloudflare deployment remain phase-two work and are not claimed as complete.
