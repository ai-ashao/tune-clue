import { useEffect, useState } from 'react'
import { fetchAuthSession, googleSignInUrl, signOut } from '@/lib/auth/client'
import type { AuthSessionResponse } from '@/lib/auth/types'

export function AccountPage() {
  const [session, setSession] = useState<AuthSessionResponse>()

  useEffect(() => {
    fetchAuthSession().then(setSession)
  }, [])

  if (!session) {
    return <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">Loading…</main>
  }

  if (!session.available || !session.authenticated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in with Google to view your TuneClue credits.
        </p>
        {session.available ? (
          <a
            className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            href={googleSignInUrl('/account')}
          >
            Continue with Google
          </a>
        ) : null}
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <p className="text-sm font-medium">{session.user.name || session.user.email}</p>
        <p className="mt-1 text-sm text-muted-foreground">{session.user.email}</p>
        <p className="mt-5 text-2xl font-semibold">{session.credits}</p>
        <p className="text-sm text-muted-foreground">Available credits</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            className="inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-medium"
            href="/earn-credits"
          >
            Earn free credits
          </a>
          <button
            className="inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-medium"
            onClick={async () => {
              await signOut()
              window.location.assign('/')
            }}
            type="button"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  )
}
