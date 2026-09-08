# ShipLean Architecture

## Runtime shape

ShipLean is one TanStack Start, Cloudflare-first **product template** with two explicit product modes. File routes own HTTP and page composition. Plain TypeScript modules own product rules. The repository is intentionally small enough for a coding Agent to inspect before it edits.

```text
downloaded template
        ↓
choose product mode + product identity
        ↓
coding Agent + shiplean-quick-start Skill
        ↓
independent product repository
        ↓
Tool surface OR SaaS surface
        ↓
shared Core contracts
        ↓
pnpm verify
```

The ShipLean marketing website is a separate product and repository: `ai-ashao/shiplean-site`. Marketing copy, vendor pricing, and ShipLean sales composition do not belong in this runtime.

## Product modes

`src/lib/product-config.ts` is the top-level product-composition source of truth.

```text
ShipLean Core
├── SaaS Mode
│   ├── SaaS navigation + Header CTA
│   ├── neutral SaaS starter homepage
│   ├── pricing entry
│   └── local application-shell example
└── Tool Mode
    ├── Tool navigation without SaaS CTA
    ├── task-first Tool Landing homepage
    ├── Tool Registry / Related Tools
    └── Tool first-viewport QA
```

Mode affects page composition and shell behavior. It does not fork the framework, SEO, i18n, legal-review, UI primitive, security, or verification infrastructure.

Tool QA routes explicitly resolve to the Tool shell even when the checked-in starter defaults to SaaS, so both contracts remain testable in one repository.

## Repository entry points

- `.agents/skills/shiplean-quick-start/SKILL.md`: establishes an independent product repository and turns a product idea into an implementation workflow;
- `AGENTS.md`: product boundary, safety rules, and completion command;
- `docs/product-modes.md`: Tool/SaaS composition boundary and marketing-site separation;
- `src/lib/product-config.ts`: active product mode and neutral starter brand;
- `docs/getting-started.md`: tutorial from checkout to Agent-built, verified MVP;
- `docs/configuration.md`: environment and sandbox configuration reference;
- `TASKS/`: explicit contracts for substantial modules;
- `src/routes`: public, session, and application surfaces;
- `src/i18n`: locale configuration, shell messages, and stable localized route registries;
- `src/components/ui`: local shadcn/ui primitives owned by the downloaded project;
- `components.json` and `src/styles.css`: shadcn aliases, Tailwind entrypoint, and neutral design tokens;
- `src/lib/auth`: visibly local identity boundary;
- `src/lib/legal.ts` and `src/modules/legal-profile.ts`: current free/local/account-free Tool Privacy/Terms structure and launch-review validation;
- `src/lib/seo.ts` and `src/lib/seo-validation.ts`: shared public metadata generation plus structured blocking and advisory diagnostics;
- `src/modules/manifests.ts`: machine-readable module ownership and acceptance;
- `src/start.ts`: global security headers;
- `scripts/e2e-smoke.mjs`: fresh-server acceptance path.

## Current trust boundary

The local identity demo establishes an eight-hour HttpOnly, SameSite=Lax cookie and protects the dashboard workflow in the browser. It does not create an external account or imply that production auth is configured.

When a real MVP needs accounts, replace the server adapter while keeping provider session types out of product UI and preserving protected-route tests.

## SEO and localization boundary

Metadata authoring has two explicit layers. The generic audit checks structural requirements and reports non-blocking editorial guidance. Tool Landing adds typed experience and truthful-messaging checks. The HTTP acceptance path independently crawls every same-origin sitemap URL and verifies final server-rendered metadata.

Localized public pages are matched by stable page identity rather than by rewriting URL strings. Canonical paths, language switches, reciprocal `hreflang`, and sitemap entries come from the same registry. A missing locale path means that translation does not exist.

## Legal boundary

The current `free-local-tool` legal module remains intentionally limited to free tools without production accounts, payments, user-content publishing, or server-side persistence of primary tool inputs. The scaffold keeps the profile in `starter` review status, visibly marks it as not launch-ready, emits `noindex`, and excludes it from the sitemap.

Subscription-SaaS legal modules remain deferred. SaaS Product Mode does not imply that production SaaS legal terms, billing, auth, or data processing have been implemented.

## Phase-two boundaries

Payments, orders, provider webhooks, entitlements, credits, production auth, PostgreSQL, email, and object storage are not part of the current Core. Provider signatures must be verified before domain events are accepted, and credits must use an append-only ledger rather than a mutable balance as the source of truth.

## Deployment status

Cloudflare Workers is the only intended first production runtime. No deployment is claimed until an account-backed smoke test and configuration readback have passed.
