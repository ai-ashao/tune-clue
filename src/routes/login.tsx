import { createFileRoute } from '@tanstack/react-router'
import { SandboxLogin } from '@/components/sandbox-login'
import { requireSandboxAvailable } from '@/lib/auth/sandbox-guards'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/login')({
  loader: () => requireSandboxAvailable(),
  head: () =>
    pageHead({
      title: 'Starter Demo Login',
      description: 'Open the local SaaS starter dashboard without external auth configuration.',
      path: '/login',
      indexable: false,
    }),
  component: LoginPage,
})

function LoginPage() {
  return (
    <section className="relative grid min-h-[calc(100vh-4rem)] place-items-center overflow-hidden bg-muted/30 px-5 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
      <div className="relative w-full">
        <SandboxLogin />
      </div>
    </section>
  )
}
