---
name: shiplean-quick-start
description: Turn a downloaded ShipLean TanStack Start template into an independently owned product repository with an AI coding agent. Use when starting a new ShipLean project, adapting its routes and branding, adding product features, or preparing the project for a verified Cloudflare-first release.
---

# ShipLean Quick Start

Build the user's product from the downloaded ShipLean template while preserving its tested boundaries and giving the product an independent Git identity.

ShipLean supports both SaaS products and public utility/tool products. The runtime template is separate from the ShipLean marketing website in `ai-ashao/shiplean-site`.

## Orient

1. Read `AGENTS.md` completely.
2. Read `ARCHITECTURE.md` for module ownership and state boundaries.
3. Read `docs/product-modes.md` and inspect `src/lib/product-config.ts`.
4. Inspect `README.md`, `package.json`, relevant routes, `git status`, current branch, and `git remote -v` when Git is present.
5. For Tool Mode, read `docs/tool-seo-brief.md`, `docs/tool-landing-standard-v0.2.md`, `docs/tool-landing-v0.2-implementation.md`, and `docs/tool-landing-v0.2.1-hardening.md`.
6. Translate the request into a concrete first user task, public routes, required state, and explicit non-goals.

## Establish project identity

Treat an explicit request to use this Skill to create or start a new product as authorization to create and bind an independent private GitHub repository for that product.

1. Derive a repository slug from the product name. Use the authenticated GitHub owner and private visibility by default.
2. If the checkout still points at the canonical ShipLean repository, rename that remote to `template`, disable its push URL, and remove any branch upstream that targets it.
3. If the downloaded archive has no Git metadata, initialize a repository with `main` as its initial branch.
4. Use authenticated GitHub tooling to create the independent repository without overwriting an existing repository. Bind it as `origin`, read back the remote branch SHA, and verify it before editing product code.
5. If GitHub authentication, ownership, or a repository-name collision prevents safe creation, stop the external mutation and report the concrete gate.

The hard invariant is that product-specific commits and pushes must never target `ai-ashao/shiplean`.

## Select product mode

Before changing the public homepage:

1. Set `productConfig.mode` in `src/lib/product-config.ts` to `saas` or `tool`.
2. Replace the neutral `Starter Product` name, mark, and description with the real product identity.
3. Keep ShipLean vendor marketing out of the product runtime.
4. For SaaS mode, use the SaaS shell contract: product/value/conversion homepage and one primary Header CTA by default.
5. For Tool mode, use the Tool shell contract: task-first homepage, no SaaS-style Header CTA, truthful value signals, and Tool Registry discovery.
6. A user-requested custom layout may replace either default composition, but not the shared quality contracts.

## Tool Mode: SEO first, then implementation

Do not start an indexable Tool build from product ideas alone.

1. Consume keyword/SERP research from the available SEO/research skill or the user's supplied evidence.
2. Populate `src/modules/tool-seo-brief.ts` with:
   - primary keyword;
   - search intent;
   - primary page;
   - supporting keywords;
   - first-batch page map;
   - shipped locales;
   - at least one evidence item.
3. Run the Tool SEO Brief validator before treating the plan as implementation-ready.
4. The SEO brief decides **which pages should exist**. ShipLean decides **how those pages are implemented and verified**.
5. Do not invent volume, KD, SERP conclusions, or research evidence.
6. Do not force a fixed number of first-batch pages from ShipLean; use the evidence.
7. Category hubs may be used when the page map requires them, but keep them lightweight: H1, intent description, core tools, real Guides when available, and useful Guidance/FAQ only when needed.
8. Keep `src/modules/tool-seo-brief.ts` synchronized when primary keyword, locale, or page-map decisions change.

A Tool Mode repository with no ready SEO brief must fail the SEO-first contract.

## Build

1. Reuse the existing TanStack Start and Cloudflare-first structure.
2. Keep the anonymous core useful without auth, a database, or secrets unless the requested feature genuinely requires them.
3. For every new public route, use the shared metadata helpers, add title, description, canonical URL, and sitemap consideration, and follow `docs/seo-metadata-standard.md`.
4. Register localized public routes under a stable identity. For public tools, use the stable Tool Registry id and its localized routes as the route source of truth for language switching, hreflang, sitemap, Related Tools, and Footer discovery.
5. Never fabricate a locale equivalent that does not exist.
6. Keep user-facing copy typed and structurally complete across shipped locales.
7. Configure Privacy Policy and Terms of Service through the shared typed profile in `src/modules/legal-profile.ts`, using the template that matches the real product behavior. Derive the default contact as `support@<public-domain>`. Legal pages follow the ordinary validation, indexing, and deployment flow rather than a separate review-status state machine.
8. Follow `docs/ui-control-spacing.md`: use shared fields and controls, preserve label-to-control spacing, and reserve explicit space between dropdown text, arrows, and adjacent actions.

### SaaS mode

9. Keep the SaaS homepage product-first: value proposition → visible product surface → outcomes → workflow → pricing entry when relevant → FAQ → final CTA.
10. A SaaS Header may expose one primary CTA. Make that CTA match the real next step.
11. Replace the starter Pricing page with the product's real pricing model before launch.
12. Do not require the full application workbench above the fold; the first viewport must clearly explain what the product is, who it is for, the core outcome, and the next action.
13. Guides stay disabled until the product has real guide content; do not publish ShipLean starter implementation guides as SaaS product content.

### Tool-site shell

14. Tool-site Header has no default CTA.
15. Configure Header/Footer through `src/lib/site-navigation.ts`, not page-specific markup.
16. For a small tool catalog, prefer `Logo | Tools | Guides | Language` **only after real Guides are enabled**. Until then, use `Logo | Tools | Language`.
17. For a large catalog, prefer `Logo | Tools | Language` and move real Guides to Footer when needed.
18. Guides belongs in one primary navigation area only: Header OR Footer.
19. Use Footer tool groups for 3–4 important categories, 4–6 live tools per group, and a category `View more` link when needed.
20. Populate `src/modules/tool-registry.ts` with real tools. A route enters sitemap only when `status: 'live'` and `indexable: true`.
21. Do not mark a Tool Registry route indexable merely because the feature works; content, metadata, intent, and internal links must be ready.
22. Automatic Related Tools must have positive tag relevance. Do not fill empty slots with unrelated live tools.
23. Remove `Workflow` and `Pricing` links in default Tool mode unless the real product explicitly needs a paid Tool-site variant.

### Default Tool Landing

24. Unless the user explicitly requests another layout, use the single `tool-default` `ToolLandingPage`.
25. Keep the task-first order: compact intro → primary tool → constraints → value signals → completion highlights → supporting sections.
26. At 1440×900 and 390×844, keep H1, concise description, complete primary tool, primary CTA, configured critical constraints, core access signals, and configured completion highlights visible without scrolling.
27. When true, make `Free`, `Online`, `No installation`, and `No signup` obvious.
28. Never invent trust claims.
29. Put basic input limits in typed `constraints`.
30. Put 3–5 concrete task abilities in `completion.highlights`.
31. Prefer `capabilities` over generic SaaS-style `features`.
32. Render How It Works only when it adds real task knowledge.
33. Use Helpful Guidance for task-specific standards, decisions, limitations, and recommendations.
34. Treat generic SEO Supporting Content as the lowest-priority explanatory layer.
35. Every indexable Tool Landing requires `seo.primaryKeyword` from the SEO brief.
36. QA/reference Tool Landing pages set `seo.indexable: false`.
37. Use `toolPageHead(config)` for Tool Landing metadata and indexability.
38. Use Tool Registry for Related Tools. Only link live canonical destinations and render the correct localized route.
39. Structured data must match visible, provable behavior.
40. Add checked-in Tool Landing configs to a contract test and require `validateToolLandingConfig(...)` to return no errors. Review advisory SEO warnings manually.

### Explicit reference/custom layout

41. If the user explicitly asks to follow a reference product, competitor, screenshot, or custom layout, that request overrides the default mode-specific homepage hierarchy.
42. Implement the custom composition locally in the product repository. Do not add a competitor-specific ShipLean preset.
43. Preserve shared Shell, SEO, i18n, accessibility, truthful value signals, mobile usability, internal-link reachability, and relevant viewport quality gates.
44. Preserve semantic QA markers such as `data-tool-title`, `data-tool-primary-region`, and `data-tool-primary-action` for custom Tool layouts.
45. Explicit design overrides the default layout, not the quality contract.

### Brand

46. Keep brand variation in product-level tokens and assets: accent, typography, radius, surfaces, borders, logo, and decorative language.
47. Do not introduce a Theme DSL without repeated evidence from at least two real product consumers.

## Handle production integrations

Treat Better Auth, PostgreSQL/Drizzle, Stripe, Resend, R2, and account-backed Cloudflare deployment as unconfigured until the repository and environment prove otherwise.

## Finish

1. Run `pnpm verify`.
2. Fix failures caused by the work and rerun the complete command.
3. Confirm `validateProductConfig(productConfig)` and `validateSeoFirstProductState()` pass.
4. For SaaS mode, confirm the public homepage has a visible value proposition plus one real next action.
5. For Tool mode, require:
   - a ready Tool SEO Brief;
   - `validateToolSiteNavigation(...)`;
   - `validateToolRegistry(...)`;
   - every checked-in Tool Landing config validation.
6. For a Tool Landing or meaningful layout change, require real-browser first-viewport evidence at 1440×900 and 390×844.
7. For upload-first tools, compare against `/tool-reference-upload`.
8. Do not claim viewport success from source inspection or jsdom.
9. Confirm every sitemap URL passes SSR metadata acceptance.
10. Confirm the internal-link graph has no broken links, indexable orphans, or pages unreachable from the homepage.
11. Keep starter/noindex routes outside the sitemap.
12. Recheck Git status, branch, remotes, and target repository before commit/push or deployment.
13. Report changed files, verification evidence, viewport results, SEO-brief status, and any remaining production boundary.
