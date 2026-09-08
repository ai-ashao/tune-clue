# Product Modes

ShipLean's runtime is a **product template**, not the ShipLean marketing website.

The public ShipLean website belongs in the separate `ai-ashao/shiplean-site` repository. The `ai-ashao/shiplean` repository must not ship vendor pricing, ShipLean marketing claims, or a ShipLean sales homepage as the default product runtime.

## Source of truth

Set the product mode in:

```ts
src/lib/product-config.ts
```

Supported modes:

```ts
type ProductMode = 'saas' | 'tool'
```

The same config owns the neutral starter brand.

## Optional product surfaces

Pricing, App, and Guides are explicit product surfaces.

Default behavior:

```text
SaaS
Pricing = enabled
App = enabled
Guides = disabled

Tool
Pricing = disabled
App = disabled
Guides = disabled
```

Guides are disabled for both modes because the checked-in guide content describes ShipLean itself and must never become indexable product content by accident.

A real product may override surfaces:

```ts
surfaces: {
  pricing: true,
  app: false,
  guides: true,
}
```

When Guides are enabled, the SEO-first residue gate requires the original ShipLean starter guide slugs to be replaced first.

## SaaS mode

Default shell while Guides are disabled:

```text
Logo | Home | Workflow | Pricing | Primary CTA | Language
```

If real product Guides are later enabled:

```text
Logo | Home | Workflow | Guides | Pricing | Primary CTA | Language
```

Default homepage:

```text
Hero
→ Product Preview
→ Outcomes
→ Workflow
→ Pricing Entry
→ FAQ
→ Final CTA
```

## Tool mode

Default shell while Guides are disabled:

```text
Logo | Tools | Language
```

If real product Guides are later enabled:

```text
Logo | Tools | Guides | Language
```

Default homepage:

```text
Compact intro
→ Primary Tool
→ Constraints
→ Value Signals
→ Completion Highlights
→ Capabilities
→ FAQ
```

Tool Mode also requires the [Tool SEO Brief Contract](./tool-seo-brief.md) before it is treated as SEO-first.

## Shared Core

Both modes share:

- TanStack Start / Cloudflare runtime;
- typed locale routes;
- SEO metadata contract;
- internal-link graph acceptance;
- legal-review infrastructure;
- Field / Select / Button spacing contract;
- accessibility baseline;
- `pnpm verify`;
- Agent Skill and repository contracts.

Product mode changes composition, navigation, route exposure, and indexability, not the underlying engineering contract.

## QA contract

`pnpm verify` is mode-aware. The browser test reads the active homepage mode. HTTP smoke verifies sitemap membership, indexability, internal links, optional surfaces, and session boundaries.

`/tool-reference` and `/tool-reference-upload` remain Tool-mode QA surfaces even when the checked-in starter defaults to SaaS mode.

## Custom layouts

A product may replace the default SaaS or Tool composition when the user explicitly asks for another layout. Custom composition must preserve SEO, accessibility, truthful-claim, responsive, internal-link, and verification contracts.

Do not add ShipLean marketing sections back into the product template. Vendor marketing belongs in `shiplean-site`.
