# TuneClue visual QA

Verified on 2026-09-10 against the local TanStack Start development server and the supplied
`preview.html`/full-page prototype screenshot.

| Surface | Viewport | Result |
| --- | --- | --- |
| Homepage | 1440 × 1000 | Sticky product header, centered hero, 900px URL workspace, trust row, alternating section bands, three-column cards, contained FAQ, dark closing CTA |
| Homepage | 390 × 844 | Hero and URL action remain above the fold; cards stack in reference order; FAQ and CTA remain usable; no horizontal overflow |
| Upload mode | Desktop + mobile | Upload control remains visible and continues to the separate identification workbench |
| TikTok URL mode | Desktop + mobile | URL is validated and continues to the live identification workbench |

Deliberate deviations:

- TuneClue's existing purple/blue/mint visual tokens are retained.
- Placeholder Blog content is not published. Recognition tips occupy the same supporting-content role
  without pretending that editorial routes exist.
- The product footer keeps the real tool and legal links.

Browser acceptance covers keyboard-focusable primary actions, desktop/mobile first viewport, route
transitions, legal templates, and horizontal overflow. Repository completion requires `pnpm verify`.
