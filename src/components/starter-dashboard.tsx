import {
  Check,
  CircleHelp,
  FileCheck2,
  FileCode2,
  FolderKanban,
  Gauge,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from 'lucide-react'

type Session = { authenticated: true; user: { email: string } }

const checks = [
  'Describe the first user and one job to be done',
  'Invoke $shiplean-quick-start in your coding agent',
  'Review every route and state the agent changes',
  'Run pnpm verify before deployment',
]

const contracts = [
  { icon: ShieldCheck, label: 'Agent rules', value: 'AGENTS.md' },
  { icon: FolderKanban, label: 'Architecture', value: 'ARCHITECTURE.md' },
  { icon: FileCode2, label: 'Acceptance', value: 'pnpm verify' },
] as const

export function StarterDashboard({ session }: Readonly<{ session: Session }>) {
  const metrics = [
    ['Runtime', 'TanStack Start', 'Single supported framework', FileCode2],
    ['Deploy target', 'Cloudflare', 'First-class configuration', Gauge],
    ['Verification', 'Ready', 'One complete command', FileCheck2],
    ['Agent Skill', 'Bundled', 'Project-aware workflow', Sparkles],
  ] as const

  return (
    <div data-starter-dashboard>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(([label, value, note, Icon]) => (
          <article className="metric-card" key={label}>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {label}
              <Icon />
            </div>
            <strong>{value}</strong>
            <p>{note}</p>
          </article>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_320px]">
        <section className="min-h-[430px] rounded-xl border bg-white p-5 sm:p-7">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">First product task</p>
              <h2 className="mt-2 text-xl font-semibold">Turn the starter into one focused MVP</h2>
            </div>
            <span className="rounded-md border bg-[#f4f8f1] px-3 py-2 text-[11px] font-medium text-[#5d9229]">
              Ready
            </span>
          </header>
          <ol className="mt-7 divide-y rounded-lg border">
            {checks.map((check, index) => (
              <li className="flex items-center gap-4 px-4 py-4" key={check}>
                <span
                  className={
                    index < 3
                      ? 'grid size-7 place-items-center rounded-full bg-[#edf5e7] text-[#5d9229]'
                      : 'grid size-7 place-items-center rounded-full border text-xs'
                  }
                >
                  {index < 3 ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span
                  className={index < 3 ? 'text-sm text-muted-foreground' : 'text-sm font-medium'}
                >
                  {check}
                </span>
                <CircleHelp className="ml-auto size-3.5 text-muted-foreground" />
              </li>
            ))}
          </ol>
        </section>
        <div className="grid gap-3">
          <section className="rounded-xl border bg-[#191a18] p-6 text-white">
            <div className="flex items-center justify-between">
              <TerminalSquare className="size-5 text-[#8fc452]" />
              <span className="font-mono text-[10px] text-white/40">AGENT PROMPT</span>
            </div>
            <code className="mt-9 block text-sm">$shiplean-quick-start</code>
            <p className="mb-0 mt-5 font-mono text-xs leading-6 text-white/50">
              Turn this template into my SaaS MVP. My first user is …
            </p>
          </section>
          <section className="rounded-xl border bg-white p-6">
            <p className="text-xs text-muted-foreground">Included contracts</p>
            <div className="mt-3 divide-y">
              {contracts.map(({ icon: Icon, label, value }) => (
                <div className="flex items-center gap-3 py-3 text-xs" key={label}>
                  <Icon className="size-4 text-muted-foreground" />
                  <span>{label}</span>
                  <code className="ml-auto text-[10px] text-muted-foreground">{value}</code>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <p className="mb-0 mt-4 text-[11px] text-muted-foreground">
        Local sandbox session · {session.user.email}
      </p>
    </div>
  )
}
