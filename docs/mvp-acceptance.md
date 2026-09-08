# MVP acceptance evidence

Scope revised on 2026-08-06: ShipLean is an Agent-ready TanStack Start SaaS scaffold. Productized SEO tools and payment modules are not part of this MVP.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Install and run without third-party secrets | `pnpm install` and the local Vite/Cloudflare dev process require no external provider | Passed |
| Download-to-Agent workflow | Repository includes `.agents/skills/shiplean-quick-start/SKILL.md`, `AGENTS.md`, architecture, and a module task contract | Passed |
| Invokable project Skill | Official `quick_validate.py` passes with PyYAML 6.0.3; repository tests assert the Skill name, project-contract read, and `pnpm verify` completion instruction | Passed |
| English and Chinese product pages | `/` and `/zh` share the stable `home` page identity, explain download → Agent → Skill → MVP, and expose a reciprocal language switch | Passed |
| Translation synchronization | English and Chinese home routes render one shared component; typed dictionaries and tests enforce the same message structure for every supported locale | Passed |
| Protected application shell | Local login creates an eight-hour HttpOnly, SameSite=Lax cookie (`Secure` over HTTPS); anonymous dashboard requests redirect before protected HTML renders and session responses are not cached | Passed |
| Public-site infrastructure | Unit and SSR assertions cover Page ID route resolution, canonical, JSON-LD, Chinese document language, reciprocal hreflang only for real translations, registry-derived sitemap paths, and no deferred tool routes | Passed |
| Security and privacy foundations | Response readback proves CSP, frame denial, nosniff, permissions and referrer policy; analytics is consent-gated, its Google Tag queue preserves native `arguments`, and fonts are self-hosted | Passed |
| One-command verification | `pnpm verify` covers Biome, platform/Skill tests, Workers production bundle, strict TypeScript, and fresh-server HTTP smoke | Passed |
| Cloudflare production target is honest | Official Cloudflare Vite plugin and Wrangler entry generate a Workers bundle locally | Locally passed; account deploy intentionally unclaimed |

## Explicitly deferred

- production authentication and PostgreSQL persistence;
- payments, orders, provider webhooks, entitlements, and credits;
- productized SEO generators or SEO SaaS features;
- Resend delivery and R2/S3 persistence;
- account-backed Cloudflare deploy, final-origin readback, and production monitoring.
