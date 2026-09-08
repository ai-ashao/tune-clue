# Tool Landing v0.2.1 Hardening

Status: **candidate hardening layer**

This patch fixes correctness and verification gaps in v0.2 before ShipLean is split into explicit Tool and SaaS product modes.

## Fixed

- Tool Registry localized routes now feed Tool language switching, hreflang, sitemap entries, localized Related Tools, and Footer discovery.
- `validateToolLandingConfig()` checks v0.2 completion count, duplicates, deprecated `features`, Capability ids, breadcrumbs, structured-data visibility, Related Tool ids, and English access/claim messaging.
- `validateSiteNavigation(config, registry)` checks unknown/planned/duplicate Footer destinations.
- `validateToolSiteNavigation()` rejects leftover starter `Workflow`/`Pricing` links for default Tool-site shells.
- `/tool-reference-upload` adds a realistic 220px upload-first QA fixture.
- Browser acceptance covers both text and upload fixtures at 1440×900 and 390×844.
- GitHub Actions runs on pushes to `main` and `dev`.
- CI explicitly installs Chromium before running `pnpm verify`.
- Patch handoff files are ignored so they are not repeatedly committed as product source.

## Still deferred

- explicit `product.mode = tool | saas`;
- SaaS Landing contract;
- Result/Workbench monetization;
- ads and analytics abstractions.
