# Cloudflare deployment boundary

ShipLean's first production target is Cloudflare Workers. The repository follows the current official TanStack Start path:

- `@cloudflare/vite-plugin` owns the `ssr` Vite environment;
- `wrangler.jsonc` points to `@tanstack/react-start/server-entry`;
- `pnpm build` creates the client assets and Workers server bundle;
- `pnpm cf-typegen` regenerates binding types after Wrangler configuration changes.

Reference: <https://tanstack.com/start/latest/docs/framework/react/guide/hosting#cloudflare-workers>

## Local evidence

```bash
pnpm verify
```

This proves local compilation and HTTP behavior. It does not prove an account-backed deployment.

## Before the first real deploy

1. Create the Worker and production hostname.
2. Keep `SHIPLEAN_SANDBOX=false`; sandbox routes return 404 outside development unless explicitly enabled.
3. Add `VITE_SITE_URL` for the final origin.
4. Add secrets with `wrangler secret put`; do not put them in `wrangler.jsonc`.
5. Run `pnpm cf-typegen`, `pnpm verify`, then `pnpm deploy`. The deploy command first runs `pnpm legal:check` and stops while the legal profile is not reviewed or launch-ready.
6. Read back `/api/health`, security headers, canonical, robots and sitemap from the final origin.
7. Keep production auth and all phase-two payment modules disabled until their adapters and deployment checks exist.

`pnpm legal:check` is read-only. `pnpm deploy` changes external state and is intentionally not run by the local MVP workflow.
