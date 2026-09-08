# Tool Landing v0.1.1 — Implementation Contract

Status: **candidate implementation** in ShipLean. The shared implementation exists, but `tool-default` is not a stable production-verified preset until browser viewport acceptance and two real product consumers have passed the contract.

## Core principles

1. **Layout fixed** — tool pages use one vertical information architecture.
2. **Brand flexible** — product repositories change global design tokens, typography, radius, surfaces, logo, and decorative language without changing the page hierarchy.
3. **Task first** — the primary tool interaction appears immediately after the compact intro.
4. **Value obvious** — eligible tools visibly answer whether the tool is free, online, requires installation, or requires signup.

## Fixed page order

The shared root shell owns **Header** and **Footer**. A tool page owns the regions between them:

1. Breadcrumb, when the route is nested.
2. Compact tool intro.
3. Value signals.
4. Complete primary tool/upload region.
5. Related tools, when eligible live destinations exist.
6. Benefits.
7. How it works.
8. Features.
9. Use cases.
10. FAQ.
11. Explanatory SEO content.
12. Bottom action.

Optional sections may be omitted. Remaining sections should not be arbitrarily reordered.

## First viewport contract

At **1440 × 900** and **390 × 844**:

- the H1 is visible;
- the concise description is visible;
- the primary value signals are visible;
- the complete upload/tool interaction and its primary CTA are visible without scrolling;
- accepted file guidance or task constraints are visible when the tool needs them;
- no horizontal overflow exists;
- sticky shell UI must not cover the H1 or primary action.

The shared component intentionally keeps the intro compact and places the tool immediately after it. The product-owned tool slot must also remain compact enough to satisfy this contract.

Do not place these above the tool:

- large hero artwork;
- logo walls;
- testimonials;
- pricing;
- long-form marketing copy;
- unrelated promotions;
- a second large CTA.

Browser evidence is required before claiming this contract passed. jsdom geometry is not sufficient.

## Primary value signals

For tools that actually satisfy the conditions, the first four visible signals are:

1. **Free**
2. **Online**
3. **No installation**
4. **No signup**

Secondary signals may include:

- Browser-based
- Files stay on your device / Data stays in your browser
- No watermark

`Browser-based` requires both `online: true` and `processing: 'local'`.

`Files stay on your device`, `processed locally`, and `no upload` require `processing: 'local'`.

Avoid unverifiable default claims such as:

- 100% secure
- safest
- fastest
- unlimited
- private

## SEO messaging contract

For English tool pages that are free and online:

- H1 prioritizes the exact primary task/keyword.
- Hero description should naturally state **free** and **online**.
- Hero description should also state **no installation** and **no signup** when true.
- Meta title or meta description should naturally include both **free** and **online**.
- Do not mechanically force the exact same title pattern on every page.

Recommended pattern:

```text
H1:
Resize Image to KB

Hero description:
Resize JPG, PNG and WebP images to your target file size online for free.
No installation or signup required.

Meta title:
Resize Image to KB - Free Online Tool

Meta description:
Free online tool to resize images to a target KB size.
No installation or signup required.
```

Use localized equivalent wording for non-English routes.

Use `toolPageHead(config)` so `ToolLandingConfig.seo` remains the single route-metadata source.

## Accessibility copy

Shared components may default to English accessible labels, but localized product pages can provide:

```ts
a11y: {
  breadcrumbLabel: '...',
  valueSignalsLabel: '...',
}
```

This page copy remains product-owned rather than being coupled to the root shell dictionary.

## Related tools

Related tools:

- are ordinary crawlable links;
- include only live canonical tools;
- exclude the current tool;
- appear immediately after the complete primary tool region;
- never displace the primary tool from the first viewport.

Use `tool-registry.ts` as the shared source of truth.

## Structured data

The candidate implementation can generate:

- `WebApplication`
- `FAQPage`
- `BreadcrumbList`

Only emit FAQ schema when the same FAQ is visibly rendered. Only emit breadcrumb schema when the visible breadcrumb exists. A free `Offer` is emitted only when `experience.free === true`.

Do not add AggregateRating, Review, SoftwareVersion, author, or similar claims without real evidence.

## Brand variation

Do not fork the page structure to make sites look different.

Change product-level design tokens instead:

- accent color;
- typography;
- radius;
- surface/border treatment;
- shadow strength;
- background;
- logo;
- decorative language.

Do not introduce a Theme DSL until at least two real consumers demonstrate a repeated abstraction need.

## Reference route

ShipLean ships `/tool-reference`, a noindex text counter used to exercise the candidate component boundary.

It proves that a working product-owned tool slot can be composed with:

- Tool Landing layout;
- Value Signals;
- `toolPageHead`;
- WebApplication / FAQ / Breadcrumb structured data;
- accessible primary interaction.

It does **not** count as one of the two real product consumers required for stable promotion.

## Promotion gate

`tool-default` may be promoted from candidate to stable only after:

1. the reference route passes real-browser viewport acceptance at 1440×900 and 390×844;
2. no horizontal overflow is present at 390×844;
3. primary CTA is visible, enabled, and keyboard focusable;
4. one real product consumer passes the same acceptance;
5. a second materially different real product consumer passes the same API and acceptance;
6. metadata, claims, structured data, and related-tool behavior remain truthful.

Required evidence:

```text
Reference route ✅
Real product A ✅
Real product B ✅
```

Until then, keep exactly one structural preset: `tool-default`.
