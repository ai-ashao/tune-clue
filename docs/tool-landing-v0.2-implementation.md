# Tool Landing v0.2 — Implementation Notes

## New typed fields

`ToolLandingConfig` now accepts:

```ts
version: '0.1' | '0.2'

constraints?: ToolConstraints

completion?: {
  highlights: ReadonlyArray<string>
}

capabilities?: {
  title: string
  items: ReadonlyArray<ToolCapability>
}

helpfulGuidance?: ReadonlyArray<HelpfulGuidanceBlock>
```

The old `features` field remains temporarily supported and is rendered as legacy Capabilities when `capabilities` is absent.

## First-view ordering

The shared default page now renders:

```text
Hero
Primary tool
Constraints
Value signals
Completion highlights
```

before the supporting sections.

This intentionally keeps the actual task above marketing content.

## Navigation configuration

`src/lib/site-navigation.ts` owns Shell navigation choices.

The downloaded ShipLean starter keeps its existing marketing nav by default.

When transforming a repository into a tool site, update only the configuration.

Small catalog example:

```ts
export const siteNavigation = {
  guidesPlacement: 'header',
  header: {
    links: ['tools', 'guides'],
    toolsHref: {
      en: '/tools',
      'zh-CN': '/zh/tools',
    },
  },
  footer: {
    toolGroups: [...],
    secondaryPages: ['about', 'contact', 'privacy', 'terms'],
  },
}
```

Large catalog:

```ts
guidesPlacement: 'footer'
header.links = ['tools']
```

The Footer automatically places Guides when `guidesPlacement === 'footer'`.

## Footer groups

Footer groups resolve `toolIds` through `src/modules/tool-registry.ts`.

Product repositories replace the empty ShipLean registry with real live tools.

Planned tools do not render.

Tool Registry supports optional localized label/href/description overrides.

## Explicit custom/reference layout

Do not add another ShipLean preset.

A product may skip `ToolLandingPage` and implement a local composition when the user explicitly requests it.

Keep shared shell/SEO/i18n/accessibility/viewport quality gates.

## Verification

The upgraded `/tool-reference` exercises:

- v0.2 constraints;
- completion highlights;
- capabilities;
- Helpful Guidance;
- noindex structured-data integration;
- complete first viewport at 1440×900 and 390×844.

The browser test also verifies:

- no Header CTA marker;
- Guides appears in Header XOR Footer;
- no horizontal overflow.
