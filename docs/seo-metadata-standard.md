# SEO Metadata Contract v0.2

ShipLean treats page metadata as public-site infrastructure, not as a productized SEO feature. The contract keeps metadata complete and internally consistent without pretending that title length, exact-match repetition, or generated copy can guarantee rankings.

For Tool Mode, metadata is downstream of the [Tool SEO Brief Contract](./tool-seo-brief.md). Keyword/SERP research stays outside ShipLean; the research handoff does not.

## Two validation layers

Layer A is the generic metadata contract in `src/lib/seo-validation.ts`. Call `auditSeoMetadata(...)` for any public page configuration. It returns structured `errors` and `warnings`.

Layer B is the Tool Landing integration in `src/lib/tool-landing-validation.ts`. Call `auditToolLandingConfig(...)` when an Agent needs structured diagnostics. Existing consumers may continue to call `validateToolLandingConfig(...)`; it returns blocking errors only.

## Metadata generation

Use `pageHead(...)` for ordinary public pages and `toolPageHead(...)` for Tool Landing pages.

- Supply a page-specific title.
- Supply a non-empty description and a root-relative canonical path.
- `twitter:title` and `twitter:description` are generated with Open Graph metadata.
- `socialImage` is optional.
- Tool Landing `seo.indexable` is explicit; reference routes set it to `false`.
- Indexable Tool Landing pages require `seo.primaryKeyword`.

## Blocking errors

Verification fails when metadata or route contracts are structurally invalid:

- title or description is blank;
- the configured path is not `/` or a root-relative site path;
- an indexable Tool Landing omits `primaryKeyword`;
- SSR renders missing, duplicated, empty, or mismatched core metadata;
- an indexable sitemap URL returns a non-200 response or emits `noindex`;
- canonical or `og:url` does not match the sitemap URL;
- Tool Landing copy contradicts its typed experience configuration.

The HTTP smoke test reads every same-origin URL in `sitemap.xml`, checks its server-rendered metadata, and audits the internal-link graph.

## Advisory warnings

The audit reports these for human review:

- titles outside roughly 30–65 characters;
- descriptions outside roughly 100–180 characters;
- an SEO description identical to the visible Hero description;
- a page title that already includes the brand before automatic branding;
- primary keyword intent that is not clearly represented in title, description, or Hero;
- invalid or ambiguous `socialImage`.

These are editorial heuristics, not search-engine limits.

## Multilingual keyword intent

The lightweight matcher is intentionally conservative:

- Latin scripts use token-level intent matching with natural variants.
- CJK / Japanese / Hangul use normalized substring and n-gram overlap.
- Other non-Latin scripts emit `seo.primary-keyword.manual-review` instead of silently passing.

ShipLean must never pretend its lightweight matcher replaces native-language SERP review.

## Authoring workflow

1. Complete SEO/SERP research outside ShipLean.
2. For Tool Mode, populate the typed Tool SEO Brief.
3. Build the page map before implementing the product surface.
4. Register the route under the correct stable page or Tool Registry identity.
5. Write metadata from verified product behavior and search intent.
6. Run the relevant audit and resolve every error.
7. Review warnings in context.
8. Run `pnpm verify` so unit, build, type, SSR sitemap, internal-link, and browser contracts execute together.
