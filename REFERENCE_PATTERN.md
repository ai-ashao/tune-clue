# Pancake UI pattern adaptation

## Visual policy

- Mode: reference-language migration.
- Preserve ShipLean identity, copy, routes, functionality, TanStack Start, and Cloudflare-first boundary.
- Reconstruct only general layout, density, palette roles, control geometry, borders, and responsive behavior.
- Do not reuse Pancake logos, copy, source code, illustrations, feedback widget, or payment-domain data.

## Pattern map

| Reference role | ShipLean role |
| --- | --- |
| Fixed desktop sidebar | Product, workflow, guides, pricing navigation |
| Compact top utility bar | Preview status, language switch, demo entry |
| Test-mode banner | Honest sandbox and unconfigured-services notice |
| Revenue KPI cards | Runtime, setup, verification, and dependency metrics |
| Revenue overview | Agent workflow and repository acceptance surface |
| Customer/transaction empty states | Deferred integrations and scaffold boundaries |

## Geometry and behavior

- Desktop: 256px fixed sidebar, 64px utility bar, full-width content, 1180px content maximum.
- Mobile: sidebar hidden; compact brand/utility header; two-column metric cards where space permits.
- Surfaces: white or warm-white, 1px low-contrast borders, 10–12px radii, almost no elevation.
- Typography: compact 12–14px supporting copy, strong numeric/status values, restrained headings.
- Accent: muted green for active/ready states; warm orange only for sandbox and caution states.
- Focus remains visible, layouts must not overflow at 320px, and motion is optional and reduced-motion safe.

## Product truth

- Local sandbox auth remains the only working auth path.
- Payment, database, production auth, orders, credits, and entitlements remain absent.
- Pricing actions remain visibly unavailable until a real sale path exists.
- `pnpm verify` remains the sole repository completion contract.
