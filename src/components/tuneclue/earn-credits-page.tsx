import { Check, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { fetchAuthSession, googleSignInUrl } from '@/lib/auth/client'
import type { AuthSessionResponse } from '@/lib/auth/types'
import {
  buildShareUrl,
  type SharePlatform,
  sharePlatforms,
  shareTaskMeta,
} from '@/lib/credits/share-tasks'

const platformMarks: Record<SharePlatform, string> = {
  whatsapp: 'WA',
  x: 'X',
}

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
    return <main className="tc-page">Loading…</main>
  }

  if (!session.available) {
    return (
      <main className="tc-page">
        <p className="tc-page-kicker">Free recognition</p>
        <h1 className="tc-page-title">Earn free credits</h1>
        <p className="tc-page-lede">
          Google sign-in and credits are not configured in this environment yet.
        </p>
      </main>
    )
  }

  if (!session.authenticated) {
    return (
      <main className="tc-page">
        <p className="tc-page-kicker">Optional rewards</p>
        <h1 className="tc-page-title">Earn free song searches</h1>
        <p className="tc-page-lede">
          Sign in with Google first. New accounts unlock a free recognition, then each one-time
          share action can earn another credit.
        </p>
        <a className="tc-header-signin mt-5" href={googleSignInUrl('/earn-credits')}>
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
    <main className="tc-page">
      <p className="tc-page-kicker">Optional rewards</p>
      <h1 className="tc-page-title">Earn free credits</h1>
      <p className="tc-page-lede">
        Open TuneClue’s share composer once on each platform. Each task is optional and worth one
        credit. You can claim up to two share credits total.
      </p>

      <div className="tc-dashboard-card">
        {sharePlatforms.map((platform) => {
          const meta = shareTaskMeta[platform]
          const claimed = completed.has(platform)

          return (
            <div className="tc-task-row" key={platform}>
              <div className="tc-platform">
                <span className="tc-platform-mark">{platformMarks[platform]}</span>
                <div>
                  <p className="m-0 text-sm font-semibold">{meta.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">One-time reward · +1 credit</p>
                </div>
              </div>
              <button
                className="tc-task-button"
                disabled={claimed || Boolean(working)}
                onClick={() => share(platform)}
                type="button"
              >
                {claimed ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Check aria-hidden="true" size={13} />
                    Claimed
                  </span>
                ) : working === platform ? (
                  'Opening…'
                ) : (
                  'Share +1'
                )}
              </button>
            </div>
          )
        })}
      </div>

      <div className="tc-balance-card">
        <div>
          <p className="tc-page-kicker">Current balance</p>
          <p className="tc-balance-number mt-2">{session.credits}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.credits === 1 ? 'song search' : 'song searches'} available
          </p>
        </div>
        <div className="text-right">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles aria-hidden="true" size={14} />
            {completed.size} / {sharePlatforms.length} claimed
          </p>
          <a className="mt-2 block text-sm font-medium text-primary hover:underline" href="/">
            Find a song →
          </a>
        </div>
      </div>

      {message ? (
        <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
          {message}
        </p>
      ) : null}

      <p className="mt-6 max-w-2xl text-xs leading-5 text-muted-foreground">
        TuneClue grants the reward when the platform share composer opens. The site cannot verify
        whether a final post or message is published.
      </p>
    </main>
  )
}
