# Upstream upgrade policy

ShipLean locks the dependency graph that passes the Agent Skill contract, local session boundary, Cloudflare bundle and HTTP smoke.

- Security fixes: assess and ship as needed.
- Ordinary TanStack, Vite and Cloudflare releases: evaluate quarterly.
- Do not chase every upstream patch solely to advertise a newer number.
- Upgrade in a branch, regenerate the route tree and Worker types, and run `pnpm verify`.
- Record breaking changes, migration steps and unresolved runtime warnings in `CHANGELOG.md` before release.

Current verified line is recorded in `research/shipfast-shipany-competitor/17-technical-architecture.md` and `pnpm-lock.yaml` remains the installed source of truth.
