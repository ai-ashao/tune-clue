import { useEffect, useState } from 'react'
import { fetchAuthSession } from '@/lib/auth/client'
import type { AuthSessionResponse } from '@/lib/auth/types'

export function AuthHeaderControls() {
  const [session, setSession] = useState<AuthSessionResponse>()

  useEffect(() => {
    let active = true
    async function refresh() {
      const next = await fetchAuthSession()
      if (active) setSession(next)
    }
    refresh()
    window.addEventListener('tuneclue:credits-changed', refresh)
    return () => {
      active = false
      window.removeEventListener('tuneclue:credits-changed', refresh)
    }
  }, [])

  if (!session?.available) return null
  if (!session.authenticated) {
    return (
      <a
        className="inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted/40"
        href="/api/auth/google?returnTo=%2F"
      >
        Sign in
      </a>
    )
  }

  const initial = (session.user.name || session.user.email).trim().charAt(0).toUpperCase() || 'U'
  return (
    <div className="flex items-center gap-2" data-auth-header>
      <a
        className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
        href="/earn-credits"
      >
        Earn Credits
      </a>
      <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
        {session.credits} {session.credits === 1 ? 'Credit' : 'Credits'}
      </span>
      <a
        aria-label="Open account"
        className="grid h-8 w-8 place-items-center rounded-full border bg-muted text-xs font-semibold"
        href="/account"
        title={session.user.email}
      >
        {initial}
      </a>
    </div>
  )
}
