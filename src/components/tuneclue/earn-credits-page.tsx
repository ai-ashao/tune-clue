import { useEffect, useMemo, useState } from 'react'
import { fetchAuthSession, googleSignInUrl } from '@/lib/auth/client'
import type { AuthSessionResponse } from '@/lib/auth/types'
import {
  buildShareUrl,
  type SharePlatform,
  sharePlatforms,
  shareTaskMeta,
} from '@/lib/credits/share-tasks'

export function EarnCreditsPage() {
  const [session, setSession] = useState<AuthSessionResponse>()
  const [working, setWorking] = useState<SharePlatform>()
  const [message, setMessage] = useState<string>()

  useEffect(() => {
    fetchAuthSession().then(setSession)
  }, [])

  const completed = useMemo(
    () => (session?.available && session.authenticated ? new Set(session.shareRewards) : new Set()),
    [session],
  )

  if (!session) {
    return <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">Loading…</main>
  }

  if (!session.available) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Earn free credits</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Google sign-in and credits are not configured in this environment yet.
        </p>
      </main>
    )
  }

  if (!session.authenticated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Earn free credits</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Sign in with Google first. New accounts unlock a free song recognition, and opening each
          platform’s share composer can earn more credits.
        </p>
        <a
          className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          href={googleSignInUrl('/earn-credits')}
        >
          Continue with Google
        </a>
      </main>
    )
  }

  async function share(platform: SharePlatform) {
    if (completed.has(platform) || working) return
    setMessage(undefined)

    const shareUrl = buildShareUrl(platform, window.location.origin)
    const popup = window.open(shareUrl, '_blank', 'noopener,noreferrer')
    if (!popup) {
      setMessage('Your browser blocked the share window. Allow pop-ups and try again.')
      return
    }

    setWorking(platform)
    try {
      const response = await fetch('/api/rewards/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platform }),
        keepalive: true,
      })
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; granted: boolean; credits: number; shareRewards: SharePlatform[] }
        | { ok: false; message: string }
        | null
      if (!payload) throw new Error('TuneClue could not read the reward response.')
      if (!payload.ok) throw new Error(payload.message)

      setSession((current) =>
        current?.available && current.authenticated
          ? { ...current, credits: payload.credits, shareRewards: payload.shareRewards }
          : current,
      )
      setMessage(
        payload.granted
          ? `+1 credit added for opening the ${shareTaskMeta[platform].label} share composer.`
          : `The ${shareTaskMeta[platform].label} reward was already claimed.`,
      )
      window.dispatchEvent(new Event('tuneclue:credits-changed'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not claim the share reward.')
    } finally {
      setWorking(undefined)
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Optional rewards
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Earn free credits</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Open TuneClue’s share composer for each platform once. The one-time reward is granted when
        the composer opens; TuneClue cannot verify whether you publish the post. You can earn up to
        3 credits total.
      </p>

      <div className="mt-6 rounded-2xl border bg-card">
        {sharePlatforms.map((platform) => {
          const meta = shareTaskMeta[platform]
          const claimed = completed.has(platform)
          return (
            <div
              className="flex items-center justify-between gap-4 border-b p-4 last:border-b-0"
              key={platform}
            >
              <div>
                <p className="font-medium">{meta.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  One-time share-intent reward · +1 credit
                </p>
              </div>
              <button
                className="inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-medium disabled:cursor-default disabled:opacity-60"
                disabled={claimed || Boolean(working)}
                onClick={() => share(platform)}
                type="button"
              >
                {claimed ? 'Claimed' : working === platform ? 'Opening…' : 'Open & claim +1'}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-muted/50 p-4">
        <div>
          <p className="text-sm font-medium">
            {completed.size} / {sharePlatforms.length} claimed
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current balance: {session.credits} {session.credits === 1 ? 'credit' : 'credits'}
          </p>
        </div>
        <a className="text-sm font-medium underline underline-offset-4" href="/">
          Find a song
        </a>
      </div>

      {message ? (
        <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
          {message}
        </p>
      ) : null}
    </main>
  )
}
