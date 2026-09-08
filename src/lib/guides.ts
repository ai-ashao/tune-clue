export const guides = [
  {
    slug: 'build-with-the-skill',
    number: '001',
    title: 'Build your MVP with the bundled Skill',
    summary: 'Download the scaffold, open it in your coding agent, and start with project context.',
    time: '4 min',
  },
  {
    slug: 'protected-app-shell',
    number: '002',
    title: 'Turn the local demo into your auth boundary',
    summary: 'Keep the dashboard protected while replacing the visibly local session adapter.',
    time: '6 min',
  },
  {
    slug: 'cloudflare-boundaries',
    number: '003',
    title: 'Cloudflare-first, without runtime soup',
    summary: 'Keep environment-specific code at the edge and the product domain portable.',
    time: '6 min',
  },
] as const

export type GuideSlug = (typeof guides)[number]['slug']

export const guideBodies: Record<GuideSlug, Array<{ heading: string; body: string }>> = {
  'build-with-the-skill': [
    {
      heading: 'Start from the downloaded repository',
      body: 'Unpack the ShipLean template into a local workspace and open that directory in Codex, Claude Code, or another coding agent that can read project files.',
    },
    {
      heading: 'Invoke the project Skill',
      body: 'Ask the agent to use $shiplean-quick-start and describe one user, one problem, and the first workflow. The Skill reads AGENTS.md and ARCHITECTURE.md before it changes code.',
    },
    {
      heading: 'Finish with evidence',
      body: 'Review the changed routes and product states, then require pnpm verify to pass. The command checks code quality, tests, the production bundle, TypeScript, and fresh-server HTTP behavior.',
    },
  ],
  'protected-app-shell': [
    {
      heading: 'The included identity is a demo boundary',
      body: 'The fixed local user and HttpOnly cookie demonstrate how public and protected application surfaces stay separate. They are visibly labeled and make no external auth call.',
    },
    {
      heading: 'Replace the adapter, not the boundary',
      body: 'When the MVP needs real accounts, have the agent add the chosen provider at the server boundary and preserve protected-route tests. Do not let provider session types spread through product UI.',
    },
    {
      heading: 'Payment comes later',
      body: 'Orders, payment webhooks, entitlements, and credits are phase-two modules. Validate the core user workflow before adding financial state and provider operations.',
    },
  ],
  'cloudflare-boundaries': [
    {
      heading: 'One production target first',
      body: 'ShipLean validates one Cloudflare Workers path before advertising more runtimes. Supporting everything on paper is less useful than one path with repeatable evidence.',
    },
    {
      heading: 'Keep product rules portable',
      body: 'Runtime bindings stay at route and adapter boundaries. Product rules remain plain TypeScript so the agent can change and test them without bringing Cloudflare details into every module.',
    },
    {
      heading: 'Deploy only after verification',
      body: 'Run pnpm verify locally first. An account-backed deployment and final-origin smoke test are separate evidence and must not be inferred from a successful local bundle.',
    },
  ],
}
