import { LogOut, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchAuthSession, googleSignInUrl, signOut } from '@/lib/auth/client'
import type { AuthSessionResponse } from '@/lib/auth/types'

export function AccountPage() {
  const [session, setSession] = useState<AuthSessionResponse>()

  useEffect(() => {
    fetchAuthSession().then(setSession)
  }, [])

  if (!session) {
    return <main className="tc-page">Loading…</main>
  }

  if (!session.available || !session.authenticated) {
    return (
      <main className="tc-page">
        <p className="tc-page-kicker">TuneClue account</p>
        <h1 className="tc-page-title">Account</h1>
        <p className="tc-page-lede">Sign in with Google to view your TuneClue credits.</p>
        {session.available ? (
          <a className="tc-header-signin mt-5" href={googleSignInUrl('/account')}>
            Continue with Google
          </a>
        ) : null}
      </main>
    )
  }

  return (
    <main className="tc-page">
      <p className="tc-page-kicker">TuneClue account</p>
      <h1 className="tc-page-title">Account</h1>

      <div className="tc-balance-card">
        <div>
          <p className="m-0 text-sm font-semibold">{session.user.name || session.user.email}</p>
          <p className="mt-1 text-sm text-muted-foreground">{session.user.email}</p>
          <p className="tc-balance-number mt-6">{session.credits}</p>
          <p className="mt-1 text-sm text-muted-foreground">Available credits</p>
        </div>
        <Sparkles aria-hidden="true" className="text-primary" size={26} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <a className="tc-header-signin" href="/earn-credits">
          Earn free credits
        </a>
        <button
          className="tc-header-signin"
          onClick={async () => {
            await signOut()
            window.location.assign('/')
          }}
          type="button"
        >
          <LogOut aria-hidden="true" size={14} />
          Sign out
        </button>
      </div>
    </main>
  )
}
