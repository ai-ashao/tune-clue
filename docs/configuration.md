# Configuration reference

ShipLean starts locally without third-party secrets. Environment variables control the public origin, optional public integrations, and the visibly local sandbox boundary.

Copy the example when you need local overrides:

```bash
cp .env.example .env.local
```

`.env.local` is ignored by Git. Do not commit real credentials.

## Public variables

Variables prefixed with `VITE_` can be exposed to browser code. Never store secrets in them.

| Variable | Default or example | Effect |
| --- | --- | --- |
| `VITE_SITE_URL` | `https://shiplean.dev` in code; `http://localhost:3000` in `.env.example` | Absolute public origin used for canonical URLs, hreflang, robots, and sitemap output. Must be an HTTP(S) URL. |
| `VITE_GA4_ID` | empty | Optional Google Analytics measurement ID. When present, it must match `G-...`. |
| `VITE_GOOGLE_SITE_VERIFICATION` | empty | Optional Google site verification token added to public metadata. |
| `VITE_ENABLE_SANDBOX` | disabled unless development or explicitly `true` | Controls whether local demo entry points are visible in the built UI. |

`src/lib/config/env.ts` validates public values when the application starts. Invalid URLs and malformed GA4 IDs fail early instead of silently generating broken metadata.

## Server-only variables

| Variable | Default or example | Effect |
| --- | --- | --- |
| `SHIPLEAN_SANDBOX` | `false` in `wrangler.jsonc`; `true` in `.env.example` | Enables the local sandbox session routes outside ordinary development detection. Keep it `false` in production unless a deliberate demo deployment requires it. |
| `RESEND_API_KEY` | empty | Reserved for the phase-two email adapter. The current MVP does not send production email. |
| `R2_BUCKET` | empty | Reserved for the phase-two object-storage adapter. The current MVP does not persist uploads to R2. |

Server variables must not use the `VITE_` prefix.

## Sandbox behavior

Development mode enables the local identity demonstration. The login creates an eight-hour HttpOnly, SameSite=Lax cookie and the dashboard checks that local session before rendering protected content.

This boundary demonstrates route protection. It is not a production account system. When real accounts become necessary, replace the server adapter and preserve anonymous-redirect and protected-route tests.

For a normal production build:

```dotenv
VITE_ENABLE_SANDBOX=false
SHIPLEAN_SANDBOX=false
```

## Cloudflare configuration

`wrangler.jsonc` defines the Workers entry point and keeps the production sandbox flag disabled. After changing bindings:

```bash
pnpm cf-typegen
pnpm verify
```

Add real secrets with Wrangler instead of putting them in `wrangler.jsonc`:

```bash
wrangler secret put SECRET_NAME
```

Do not infer deployment success from `pnpm build`. Read [Cloudflare deployment boundary](./deployment.md) for the production verification steps.

`VITE_SITE_URL` also supplies the public URL in the shared Privacy / Terms profile and derives the default `support@<domain>` contact. Localhost development uses the ShipLean starter address as a non-production fallback; production release still requires an HTTPS public URL and a reviewed legal profile.

## Related source

- `src/lib/config/env.ts`: public environment parsing and validation;
- `src/lib/config/runtime.ts`: sandbox availability rules;
- `src/lib/auth/sandbox-session.ts`: local cookie behavior;
- `src/lib/adapters/email.ts`: disabled email boundary;
- `src/lib/adapters/storage.ts`: disabled storage boundary;
- `wrangler.jsonc`: Cloudflare Workers entry and server variables.
