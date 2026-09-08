# Tool Landing Standard v0.1

Status: **candidate implementation**. ShipLean now ships a shared `tool-default` Tool Landing implementation, value-signal helpers, Tool Registry resolution, SEO messaging helpers, and structured-data helpers. The preset is not production-verified stable until the reference route and two real product consumers pass the acceptance gates below.

## Purpose

This standard gives ShipLean-derived products a stable task-first information architecture for public tools. It reduces page-by-page layout invention while keeping the actual tool runtime, product rules, state, analytics events, and claims owned by the product repository.

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** describe the contract.

## Ownership model

1. **ShipLean infrastructure** owns the application shell, design tokens, route metadata helpers, sitemap mechanism, accessibility baseline, verification command, shared Tool Landing composition, and reusable claim/registry/schema helpers.
2. **Tool Landing recipe** owns page order, section presentation, and the typed configuration boundary.
3. **Product code** owns the working tool interaction, validation, processing, editor/workbench state, provider boundary, analytics events, result behavior, copy, and evidence for every claim.

Provider payloads, processing logic, upload state, and domain state MUST NOT enter `ToolLandingConfig`.

## Canonical page sequence

Sections that are present MUST keep this order unless a product records a concrete reason and acceptance evidence.

| Order | Region | Requirement | Contract |
| --- | --- | --- | --- |
| Shell | Header | Required | Shared application shell; compact and keyboard accessible. |
| 01 | Breadcrumb | Conditional | Use for nested routes when useful; localize its accessible label. |
| 02 | Tool intro | Required | One H1, one concise description, verified supporting facts only. |
| 03 | Value signals | Conditional | Make Free / Online / No installation / No signup obvious when true. |
| 04 | Primary tool | Required | Complete working primary interaction and required guidance. |
| 05 | Related tools | Conditional | First eligible section after the tool; live relevant internal destinations only. |
| 06 | Benefits | Optional | Factual benefits with implementation evidence. |
| 07 | How it works | Conditional | Use when the task has meaningful steps or constraints. |
| 08 | Features | Optional | Shipped capabilities only. |
| 09 | Use cases | Optional | Distinct user situations, not keyword substitutions. |
| 10 | FAQ | Conditional | Real questions with visible answers only. |
| 11 | Explanatory content | Optional | Helpful constraints, formats, limitations, or decision guidance. |
| 12 | Bottom action | Optional | Repeat or link to the primary action only when it reduces effort. |
| Shell | Footer | Required | Shared application shell and privacy controls where configured. |

The intro, value signals, and primary tool form one vertical **task-first region**. They MUST NOT become a marketing-heavy desktop composition that delays the real tool.

Decorative artwork, testimonial walls, pricing, long-form copy, logo walls, and unrelated promotions MUST NOT appear between the intro and primary tool.

## First-viewport contract

At **390 × 844** and **1440 × 900**:

- H1 MUST be visible without interaction;
- concise description MUST be visible;
- primary value signals MUST be visible when applicable;
- complete primary tool interaction MUST be visible, including the primary CTA and required task/file guidance;
- no horizontal page overflow is allowed;
- sticky shell UI MUST NOT cover the H1 or primary action.

A browser-level layout check is required. Do not claim this contract passed from jsdom or source inspection alone.

The page MUST NOT satisfy the contract by using `height: 100vh` plus hidden overflow or by making the tool unusably small.

Priority is:

```text
Tool usability
> H1 readability
> description readability
> value-signal visibility
> decorative whitespace
```

## Primary value-signal contract

When true, the first four product-value answers are:

1. **Free**
2. **Online**
3. **No installation**
4. **No signup**

Secondary signals MAY include:

- Browser-based
- Files/Data stay on device/in browser
- No watermark

Truthfulness rules:

- `Browser-based` requires `experience.online === true` and `experience.processing === 'local'`.
- `processed locally`, `files stay on your device`, and `no upload` require `experience.processing === 'local'`.
- `No watermark` requires the shipped output to actually be watermark-free.
- `Fastest`, `100% secure`, `safest`, `unlimited`, and similar claims MUST NOT be defaults.

## Tool interaction boundary

The `tool` React slot is a working control, not an illustration.

For upload-first tools:

- file chooser MUST work;
- accepted types and enforced limits MUST be visible;
- invalid files MUST provide actionable recovery near the failed action;
- local-processing claims MUST match the real network boundary;
- if the product uses a separate editor/workbench, accepted files SHOULD transition there without moving the editor into the public landing page;
- stateful workbench routes SHOULD be noindex unless a concrete indexing reason is documented.

For non-upload tools, the same principles apply to their primary input, action, error recovery, and result path.

## Related tools

Related tools MUST:

- come from live canonical destinations;
- omit the current tool;
- be ordinary crawlable links;
- appear after the complete primary tool;
- never push the primary tool below the first viewport.

The shared registry MAY rank by explicit requested IDs or task-relevance tags. Planned and unknown tools are omitted.

## SEO messaging contract

Every public Tool Landing route MUST consider:

- title;
- description;
- canonical;
- sitemap membership;
- robots;
- Open Graph;
- localized alternates when real equivalents exist.

For English free-online tools:

- H1 prioritizes the exact primary task/keyword;
- hero description SHOULD naturally state **free** and **online**;
- hero description SHOULD state **no installation** and **no signup** when true;
- meta title or meta description SHOULD naturally include **free** and **online**.

Do not mechanically produce the same title syntax for every page.

Use `toolPageHead(config)` so `ToolLandingConfig.seo` is the single route metadata source.

## Structured-data contract

The candidate implementation provides helpers for:

- `WebApplication`;
- `FAQPage`;
- `BreadcrumbList`.

Rules:

- `WebApplication` is for a working application only;
- a free Offer appears only when the tool is actually free;
- FAQ schema requires the same visible questions and answers;
- BreadcrumbList requires the matching visible breadcrumb;
- structured data MUST NOT invent ratings, reviews, pricing, compatibility, privacy, or availability claims.

Automatic sitemap registration is still separate from this helper layer.

## Accessibility contract

A conforming flow MUST:

- preserve visible keyboard focus;
- use one H1 and logical heading order;
- label inputs and controls by purpose;
- announce relevant asynchronous result/error state;
- keep error recovery near the failed action;
- honor reduced motion;
- remain usable at 320 CSS pixels without horizontal scrolling.

Shared Tool Landing accessibility labels can be localized through `config.a11y`.

## Brand contract

**Layout fixed, brand flexible.**

Brand differences belong to product-level design tokens and assets:

- accent color;
- typography;
- radius;
- surfaces/borders;
- shadows;
- background;
- logo;
- decorative language.

Do not create `image-tool`, `converter-tool`, `calculator-tool`, `generator-tool`, `game-tool`, or a Theme DSL until two real products prove a repeated structural need that the current tool slot and optional sections cannot express.

## Reference and promotion gate

ShipLean's noindex `/tool-reference` route is infrastructure acceptance evidence only. It does not count as a real product consumer.

Stable promotion requires:

1. reference route browser acceptance at 1440×900 and 390×844;
2. no horizontal overflow;
3. visible/enabled/keyboard-focusable primary action;
4. Real product A using the same shared API and passing acceptance;
5. Real product B, materially different from A, using the same API and passing acceptance;
6. truthful metadata, value signals, structured data, and related links.

Required evidence:

```text
Reference route ✅
Real product A ✅
Real product B ✅
```

Until that evidence exists, `tool-default` remains a candidate implementation.
