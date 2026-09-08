import { createFileRoute } from '@tanstack/react-router'
import { SandboxLogout } from '@/components/sandbox-logout'
import { StarterDashboard } from '@/components/starter-dashboard'
import { requireSandboxSession } from '@/lib/auth/sandbox-guards'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/dashboard')({
  loader: () => requireSandboxSession(),
  head: () =>
    pageHead({
      title: 'SaaS Starter Dashboard',
      description:
        'Preview the protected SaaS dashboard shell and local starter workflow before production auth is configured.',
      path: '/dashboard',
      indexable: false,
    }),
  component: DashboardPage,
})

function DashboardPage() {
  const session = Route.useLoaderData()
  return (
    <section className="mx-auto min-h-[80vh] max-w-[1180px] px-4 py-7 sm:px-6 sm:py-10">
      <header className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs text-muted-foreground">Local starter / Application shell</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            Good afternoon, maker.
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
            This protected route is ready to become your product workspace. Start with one useful
            user task.
          </p>
        </div>
        <SandboxLogout />
      </header>
      <StarterDashboard session={session} />
    </section>
  )
}
