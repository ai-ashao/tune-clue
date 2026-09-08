# Build your first ShipLean MVP

This tutorial takes a fresh ShipLean download from a local checkout to an Agent-built, verified MVP. You will run the TanStack Start scaffold first, then give the bundled Skill one focused product workflow.

ShipLean currently supports **TanStack Start only**. It does not include a Next.js edition or a framework selector.

## What you need

- access to the private `ai-ashao/shiplean` GitHub repository or a downloaded archive;
- Git if you plan to clone the repository;
- pnpm compatible with the repository's pinned `packageManager` version;
- Codex, Claude Code, or another coding Agent that can read the local project directory.

No database, payment account, auth provider, or third-party secret is required for the first local run.

## Step 1: Create the local template checkout

Clone the private repository into a new product folder:

```bash
git clone git@github.com:ai-ashao/shiplean.git my-saas
cd my-saas
```

If you received a ZIP archive, unpack it and open the extracted directory in your terminal instead.

At this point a Git clone still points at the ShipLean template repository. Do not commit or push product work to that remote. The bundled Skill creates and binds the independent product repository before it changes the product.

## Step 2: Install and run the scaffold

Install the locked dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. The public starter page should load without external credentials.

The `/login` and `/dashboard` routes demonstrate a visibly local identity boundary. They do not create a production account.

## Step 3: Open the project in your coding Agent

Open the same `my-saas` directory in Codex, Claude Code, or your preferred coding Agent. Send a product brief like this to the Agent:

```text
Use $shiplean-quick-start to turn this template into a bilingual feedback SaaS.
The first user is a solo founder.
The first workflow is creating one feedback board and sharing its public link.
Keep production auth, payments, and teams out of this MVP.
```

`$shiplean-quick-start` is an Agent Skill invocation. It is **not** a command to type in the terminal.

An explicit request to create or start a new product authorizes the Skill to create a private GitHub repository using the authenticated GitHub account. It derives the repository name from the product name, keeps the ShipLean remote fetch-only as `template`, binds the new repository as `origin`, and pushes only after `pnpm verify` passes. It asks for input only when the product name or owner is ambiguous, GitHub is not authenticated, or a repository-name collision needs a decision.

If the Agent does not discover project Skills automatically, use this prompt instead:

```text
Read .agents/skills/shiplean-quick-start/SKILL.md completely, then follow it to build the product described below.
```

## Step 4: Give the Agent a useful product brief

The shortest useful brief names four things:

1. **First user**: who should get value first.
2. **First problem**: what is difficult for that person now.
3. **First workflow**: the smallest end-to-end task that solves the problem.
4. **Non-goals**: what the first version should deliberately leave out.

Use this reusable prompt:

```text
Use $shiplean-quick-start to build [product].
The first user is [specific user].
Their first problem is [specific problem].
The first complete workflow is [start → useful result].
Do not add [explicit non-goals] yet.
```

The Skill instructs the Agent to read `AGENTS.md`, `ARCHITECTURE.md`, relevant routes, and the repository state before changing the product. It then preserves the TanStack Start and Cloudflare-first boundaries while it implements the first workflow.

Before accepting any product commit or push, the Skill verifies that `origin` is the independent product repository and never `ai-ashao/shiplean`.

## Step 5: Review the result

Before accepting the implementation, check that:

- the first user can finish the promised workflow;
- public routes have intentional titles and descriptions;
- local sandbox behavior is still visibly different from production behavior;
- the Agent did not claim that deferred providers are configured;
- narrow screens, keyboard focus, and reduced-motion behavior still work.

Ask the Agent to report the files changed, the behavior delivered, and any production integrations still deferred.

## Step 6: Run the repository contract

Run the complete verification command:

```bash
pnpm verify
```

It checks formatting and lint rules, platform and Skill tests, the Cloudflare-oriented production build, strict TypeScript, and a fresh-server HTTP smoke test.

A passing command proves the local repository contract. It does not prove that a Cloudflare account deployment succeeded.

## Step 7: Prepare a Cloudflare deployment

Read [Cloudflare deployment boundary](./deployment.md) before changing external infrastructure. The short path is:

```bash
pnpm cf-typegen
pnpm verify
pnpm deploy
```

`pnpm deploy` changes external state. Run it only after Wrangler is authenticated and `VITE_SITE_URL` and sandbox flags match the intended production environment.
It runs the strict legal-profile check before the build, so a starter or incomplete Privacy / Terms profile cannot deploy through this command.

## Troubleshooting

### The Agent cannot find `$shiplean-quick-start`

Ask it to read `.agents/skills/shiplean-quick-start/SKILL.md` directly. The workflow is stored in the downloaded repository and does not require a globally installed Skill.

### `pnpm` uses the wrong version

Read the `packageManager` field in `package.json` and activate that pnpm version with your normal package-manager setup before installing dependencies.

### GitHub repository creation is blocked

Confirm that GitHub tooling is authenticated for the intended owner and that the derived private repository name is available. The Skill must leave the ShipLean template remote push-disabled and report the repository step as incomplete; it must not push product code back to ShipLean.

### The dashboard redirects to `/login`

That is the expected protected-route behavior. Use the visibly labeled local login during development. Do not treat it as production auth.

### A production build hides the sandbox UI

That is intentional. Production sandbox routes remain disabled unless their explicit environment flags are enabled. Replace the local adapter when the product genuinely needs accounts.

## What you built

You now have an independently owned GitHub product repository, a locally running TanStack Start product, a product brief that the repository Skill can execute, and a repeatable acceptance command. Continue with:

- [Configuration reference](./configuration.md)
- [ShipLean architecture](../ARCHITECTURE.md)
- [MVP acceptance evidence](./mvp-acceptance.md)
- [Upgrade policy](./upgrades.md)
