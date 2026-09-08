# Pancake-language migration plan

> [!NOTE]
> This is a completed visual-migration record, not the rolling product source of truth. Current boundaries and evidence live in `README.md`, `ARCHITECTURE.md`, and `docs/mvp-acceptance.md`.

## Completed scope

1. Map the reference sidebar, utility bar, sandbox banner, KPI cards, overview panels, and responsive collapse to ShipLean product roles.
2. Replace the shared application shell with compact desktop and mobile navigation surfaces.
3. Rebuild the English and Chinese marketing home around repository status and workflow panels.
4. Apply the same visual system to pricing, guides, login inheritance, and the protected starter dashboard.
5. Preserve local sandbox auth and all existing route, SEO, and Cloudflare-first behavior.
6. Verify formatting, tests, build, strict types, fresh-server E2E, and live responsive behavior.

## Explicit exclusions

- No payment, order, entitlement, credit, database, or production auth implementation.
- No copied reference assets, brand names, dashboard data, feedback widget, or scripts.
- No framework or deployment-target expansion.
