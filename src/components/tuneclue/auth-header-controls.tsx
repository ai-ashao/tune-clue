import { Sparkles } from 'lucide-react'
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
      <a className="tc-header-signin" href="/api/auth/google?returnTo=%2F">
        Sign in
      </a>
    )
  }

  const initial = (session.user.name || session.user.email).trim().charAt(0).toUpperCase() || 'U'

  return (
    <div className="flex items-center gap-2" data-auth-header>
      <a
        className="tc-header-link hidden font-medium text-muted-foreground hover:text-foreground sm:inline"
        href="/earn-credits"
      >
        Earn Credits
      </a>
      <span className="tc-credit-pill">
        <Sparkles aria-hidden="true" size={12} />
        {session.credits}
      </span>
      <a aria-label="Open account" className="tc-avatar" href="/account" title={session.user.email}>
        {initial}
      </a>
    </div>
  )
}
