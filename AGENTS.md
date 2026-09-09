# ShipLean Agent Contract

## Product boundary

ShipLean is a TanStack Start–only, Cloudflare-first product starter. Do not introduce Next.js, multi-framework abstractions, or claims that an untested provider/runtime is supported.

The runtime in this repository is not the ShipLean marketing website. ShipLean's public marketing surface belongs in the separate `ai-ashao/shiplean-site` repository. Do not add ShipLean vendor pricing, sales copy, or scaffold-marketing sections to the product runtime.

## Product mode

- Read `src/lib/product-config.ts` before changing the public shell.
- Set `productConfig.mode` explicitly to `saas` or `tool` based on the requested product.
- Replace the neutral `Starter Product` brand with the real product identity during adaptation.
- SaaS and Tool modes share Core infrastructure but use different navigation and homepage contracts.
- SaaS mode may expose one primary Header CTA and uses a product/value/conversion homepage.
- Tool mode has no SaaS-style Header CTA by default and uses the task-first Tool Landing contract.
- Keep `/tool-reference` and `/tool-reference-upload` as Tool-mode QA surfaces even when the active starter mode is SaaS.
- Read `docs/product-modes.md` for the mode boundary.

## SEO-first Tool contract

Tool Mode is SEO-first, not product-first.

Before implementing an indexable Tool product:

1. Consume keyword/SERP research from the available SEO/research workflow.
2. Populate `src/modules/tool-seo-brief.ts`.
3. Validate the primary keyword, search intent, first-batch page map, locales, and research evidence.
4. Build the planned search pages before adding optional product complexity.
5. Keep indexability explicit: a Tool Registry route enters sitemap only when `status: 'live'` and `indexable: true`.
6. Every indexable Tool Landing requires `seo.primaryKeyword`.
7. Do not enable Guides while the original ShipLean starter guide content remains.
8. Prefer fewer relevant Related Tools to unrelated filler links.
9. Preserve a crawlable internal-link path from the homepage to every indexable page.

ShipLean consumes the SEO brief. It does not own keyword-volume APIs, SERP scraping, competitor scoring, or ranking promises.

Read `docs/tool-seo-brief.md`.

## Working rules

- Keep the downloaded scaffold useful without a database, payment provider, or external secrets.
- When phase-two payment modules are introduced, keep provider payloads out of domain rules.
- A future payment event must be verified by its adapter before applying entitlements in production.
- Future credits must use an append-only ledger rather than a mutable balance as the source of truth.
- Sandbox behavior must remain visually and technically distinguishable from real payment/auth.
- File-based tool-site landing pages must use a vertical first-viewport structure and fully show the upload area. After valid files are selected, navigate to a separate editor/workbench route; do not place the editor workbench on the landing page.
- New public routes need title, description, canonical, and sitemap consideration.
- Public metadata must use the shared helpers and SEO audit contract. Treat structural failures as errors and editorial length or keyword guidance as warnings.
- Register localized public routes by stable page identity. Only real translated equivalents may produce a language switch or `hreflang`; derive sitemap entries from the same registry.
- Localized variants of one page must render the same shared page component. Keep user-facing copy in typed locale dictionaries; do not duplicate substantial JSX across locale route files.
- Privacy and Terms routes must use the shared legal templates and `src/modules/legal-profile.ts`; do not replace them with duplicated free-form route copy. Keep their product facts aligned with implemented behavior.
- Default product contact and support email is `support@<public-domain>` unless the user specifies another address.
- Legal pages follow the ordinary public-page contract. Apply temporary crawl/index restrictions through the site-wide indexing switch rather than a legal review state.
- Preserve keyboard focus, narrow-screen layout, and reduced-motion behavior.
- Use the shared Field, Select, and Button spacing contract: labels must not touch controls, dropdown text/arrows need explicit trailing space, and adjacent controls need horizontal and wrapped vertical gaps.

## Completion command

Run `pnpm verify`. It must pass formatting/lint checks, strict TypeScript, domain tests, SEO assertions, internal-link acceptance, browser viewport acceptance, and the production build.

Before a production deployment, run `pnpm verify`, then use `pnpm deploy`.

## Current non-goals

- Next.js and shared framework packages
- Productized SEO tools or SEO SaaS features
- Keyword-volume APIs, SERP scraping, or ranking prediction inside ShipLean
- Payments, orders, webhooks, entitlements, and credits before phase two
- Subscription-SaaS Privacy / Terms modules before their later dedicated phase
- Teams, RBAC, multi-tenancy, and a no-code editor
- Creem, PayPal, Alipay, or WeChat Pay adapters
- Claiming a production Cloudflare smoke test before it has actually run
