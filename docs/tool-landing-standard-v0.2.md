# Tool Landing Standard v0.2

Status: **candidate implementation contract**.

v0.2 evolves ShipLean's Tool Landing from a fixed page composition into a task-first tool-site system.

Core principles:

```text
Layout fixed.
Brand flexible.
Task first.
Value obvious.
Capabilities explicit.
```

## Default vs explicit custom layout

ShipLean provides exactly one shared structural preset:

```text
tool-default
```

When the user explicitly requests a reference product, screenshot, competitor layout, or custom composition, the product repository MAY bypass the default `ToolLandingPage` hierarchy.

That override MUST remain product-local. Do not create competitor-specific ShipLean presets.

Explicit design overrides the default layout, not the quality contract.

Custom layouts must still preserve:

- Header/Footer shell requirements;
- canonical / hreflang / robots / sitemap behavior;
- truthful structured data;
- truthful value signals;
- first-viewport primary-task visibility;
- mobile usability;
- accessibility;
- `pnpm verify`.

## Header

Default tool-site Header contains no CTA.

Recommended:

Small catalog:

```text
Logo | Tools | Guides | Language
```

Large catalog:

```text
Logo | Tools | Language
```

`Guides` then moves to Footer.

Guides appears in one primary navigation area only:

```text
Header OR Footer
```

## Footer

Default tool-site Footer is a **Tool Directory + Trust / Legal Footer**.

Desktop target:

```text
Tool Group A       Tool Group B       Tool Group C       Tool Group D
4–6 links          4–6 links          4–6 links          4–6 links
View more →        View more →        View more →        View more →

──────────────────────────────────────────────────────────────

© Brand

Guides* | FAQ/custom | About | Contact | Privacy | Terms
```

`Guides*` appears only when it is not in Header.

Rules:

- maximum four default tool groups;
- maximum six visible tool links per group;
- use live Tool Registry entries only;
- use category hubs via `View more` instead of dumping the whole catalog;
- ordinary crawlable links only;
- mobile stacks groups vertically; no carousel.

## Default Tool Landing hierarchy

```text
Breadcrumb (conditional)

Eyebrow (optional)
H1
Subtitle

PRIMARY TOOL

CONSTRAINTS
formats / limits / dimensions / task restrictions

TASK ACCESS + CONFIDENCE
Free
Online
No installation
No signup
Browser-based / local / no watermark when proven

TASK COMPLETION SUMMARY
3–5 concrete capability highlights

──────── FIRST VIEWPORT TARGET ────────

Related Tools

Capabilities

How It Works
only when it adds real task knowledge

Use Cases
only materially distinct situations

Helpful Guidance

FAQ

SEO Supporting Content

Bottom Action (optional)
```

## First viewport

At 1440×900 and 390×844, the default template should keep these fully visible without scrolling:

- H1;
- concise description;
- complete primary tool;
- primary CTA;
- configured critical constraints;
- core access signals;
- configured completion highlights.

Do not satisfy this by using hidden overflow or shrinking controls below practical usability.

When space is tight, reduce decorative whitespace before removing task information.

Tool inputs also follow the shared [UI Control Spacing Contract](./ui-control-spacing.md). Labels must not touch inputs or selects, dropdown text and arrows must retain trailing space, and adjacent actions must keep both horizontal and wrapped vertical gaps.

## Task Access

`experience` answers whether the user can begin immediately:

```ts
experience: {
  free: true,
  online: true,
  installationRequired: false,
  signupRequired: false,
  processing: 'local',
  noWatermark: true,
}
```

Core signals when true:

```text
Free
Online
No installation
No signup
```

## Task Confidence

Truth rules:

```text
Browser-based
→ online === true AND processing === 'local'

Data / files stay local
→ processing === 'local'

No watermark
→ noWatermark === true
```

Do not default to unproven claims such as `100% secure`, `fastest`, `safest`, or `unlimited`.

## Constraints

Basic restrictions must be visible near the tool rather than buried in FAQ.

Examples:

```text
JPG · PNG · WebP
Max 20 MB
Up to 20 files
1280×720 recommended
```

## Task Completion

`completion.highlights` contains 3–5 concise, concrete capability facts.

Good:

```text
Batch processing
Exact target size
Crop before export
1280×720 preset
JPG / PNG output
```

Bad:

```text
Powerful
Advanced
Modern
Smart
High performance
```

## Capabilities

v0.2 prefers `capabilities` over the v0.1 `features` field.

`features` remains temporarily supported only for migration compatibility.

## How It Works

Omit generic filler.

Bad:

```text
Upload
Process
Download
```

Useful:

```text
Upload your thumbnail
Choose 1280×720 or a custom size
Adjust the 16:9 crop
Export JPG or PNG
```

## Helpful Guidance

Helpful Guidance is the preferred educational layer for decision-support content that directly improves task completion.

Examples:

```text
Recommended YouTube thumbnail size
Recommended aspect ratio
Maximum upload size
JPG vs PNG
Why exact file-size compression may vary
```

Priority:

```text
Primary Tool
> Task Completion
> Helpful Guidance
> FAQ
> SEO Supporting Content
```

Do not add long generic text simply to increase page word count.

## HCU / research boundary

ShipLean owns reusable product communication:

```text
Task Access
Task Confidence
Constraints
Task Completion
Capabilities
Helpful Guidance
```

ShipLean does not own:

```text
Helpful Strength scoring
Ranking Moat
Attackability
SERP scanning
keyword selection
competitor scoring
```

Those belong to SEO/research Skills.

## Promotion

v0.2 remains candidate until:

```text
Reference route ✅
Real product A ✅
Real product B ✅
```

All must pass browser acceptance, mobile overflow checks, truthful claims, and structured-data validation.
