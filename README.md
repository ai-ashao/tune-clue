# ShipLean

[简体中文](README.zh-CN.md)

An Agent-ready TanStack Start product scaffold for turning a focused product idea into a verified MVP without paying for a heavyweight boilerplate.

ShipLean provides **TanStack Start only** and supports two explicit product compositions: **SaaS** and **Tool**.

The runtime in this repository is the **product template**, not the ShipLean marketing website. The public ShipLean website lives separately in `ai-ashao/shiplean-site`.

## Product modes

Set the active mode and product identity in:

```text
src/lib/product-config.ts
```

```ts
productConfig.mode = 'saas'
// or
productConfig.mode = 'tool'
```

The checked-in runtime uses the neutral brand `Starter Product` so cloning the template does not accidentally produce a ShipLean-branded product.

- **SaaS mode**: product/value/conversion homepage, product preview, workflow, pricing entry, FAQ, and one primary Header CTA by default.
- **Tool mode**: task-first Tool Landing homepage, Constraints, Value Signals, Completion Highlights, Capabilities, and no SaaS-style Header CTA by default.

See [Product Modes](./docs/product-modes.md).

## Use the downloaded template

1. Download and unpack ShipLean into a local workspace.
2. Open the repository in Codex, Claude Code, or another coding agent that can read project files.
3. Invoke the bundled Skill and describe the product.

SaaS example:

```text
Use $shiplean-quick-start to turn this template into a bilingual feedback SaaS.
The first user is a solo founder and the first workflow is collecting one shareable feedback board.
```

Tool example:

```text
Use $shiplean-quick-start to build a free bilingual image utility.
Use the default Tool Landing, keep the first task anonymous, and populate the live Tool Registry.
```

The canonical Skill lives at `.agents/skills/shiplean-quick-start/SKILL.md`.

The Skill reads `AGENTS.md`, `ARCHITECTURE.md`, and the Product Mode contract, creates an independent private GitHub repository, scopes the first workflow, implements the requested product, and finishes with `pnpm verify`.

## Run locally

```bash
pnpm install
pnpm dev
```

No external secret is required. `/login` and `/dashboard` form a visibly labeled local identity demo.

## Verify

```bash
pnpm verify
```

The command checks formatting/lint, unit contracts, the Cloudflare-oriented build, strict TypeScript, HTTP smoke, and Playwright browser acceptance.

The Tool Landing browser gate covers both a compact text fixture and a realistic upload-first fixture at:

```text
1440 × 900
390 × 844
```

GitHub Actions runs verification for pull requests and pushes to `main` and `dev`.

## Current foundation

Included now:

- TanStack Start, React, and strict TypeScript;
- explicit `product.mode = 'saas' | 'tool'`;
- neutral mode-specific starter homepages and shell navigation;
- shadcn/ui + Tailwind local UI foundation;
- guide, pricing, login, and protected dashboard examples;
- bundled `shiplean-quick-start` Skill;
- local HttpOnly identity demo;
- Cloudflare-first build path;
- canonical, hreflang, robots, sitemap, and locale-aware public routing;
- structured SEO metadata audits plus sitemap-wide SSR metadata acceptance;
- Tool Landing v0.2 task-first composition;
- Tool Registry-driven localized tool routes, Related Tools, Footer discovery, hreflang, and sitemap;
- Constraints, Value Signals, Completion Highlights, Capabilities, Helpful Guidance, and structured data;
- Tool Landing, Tool Registry, Site Navigation, Tool-site, SaaS-site, and Product Config validators;
- a shared, typed Privacy Policy and Terms template for free, account-free, browser-local tools, with a visible legal-review gate;
- real-browser acceptance.

Deferred:

- subscription-SaaS Privacy and Terms modules;
- production auth and PostgreSQL;
- payments, email, and object storage;
- Result/Workbench monetization;
- ads and analytics abstractions.

## Documentation

- [Build your first ShipLean MVP](./docs/getting-started.md)
- [Architecture](./ARCHITECTURE.md)
- [Product Modes](./docs/product-modes.md)
- [Tool Landing Standard v0.2](./docs/tool-landing-standard-v0.2.md)
- [Tool Landing v0.2 implementation](./docs/tool-landing-v0.2-implementation.md)
- [Tool Landing v0.2.1 hardening](./docs/tool-landing-v0.2.1-hardening.md)
- [SEO Metadata Contract v0.1](./docs/seo-metadata-standard.md)
- [UI control spacing contract](./docs/ui-control-spacing.md)
- [Legal page template](./docs/legal-pages.md)
- [Current feature status](./docs/FEATURE_STATUS.md)
- [MVP acceptance evidence](./docs/mvp-acceptance.md)
