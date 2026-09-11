import { ArrowLeft, Check, CreditCard, LockKeyhole } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { fetchAuthSession, googleSignInUrl } from '@/lib/auth/client'
import type { AuthSessionResponse } from '@/lib/auth/types'
import { billingRequest, money } from '@/lib/billing/client'
import { safeReturnTo } from '@/lib/billing/config'
import type { PublicCatalog, PublicOrder } from '@/lib/billing/types'
import { BillingError } from '@/lib/billing/types'
import './billing.css'

export function BuyCreditsPage() {
  const rulesHeadingId = useId()
  const [catalog, setCatalog] = useState<PublicCatalog>()
  const [session, setSession] = useState<AuthSessionResponse>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string>()
  const [returnTo, setReturnTo] = useState('/account')
  const [accepted, setAccepted] = useState(false)
  const requestIds = useRef<Record<string, string>>({})
  const submitting = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    setReturnTo(safeReturnTo(new URL(window.location.href).searchParams.get('returnTo')))
    billingRequest<PublicCatalog>('/api/billing/catalog', undefined, controller.signal)
      .then(setCatalog)
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Billing could not load.')
      })
    fetchAuthSession()
      .then(setSession)
      .catch(() => setSession({ available: false, authenticated: false }))
    return () => controller.abort()
  }, [])

  async function purchase(packId: string) {
    if (submitting.current || !accepted) return
    if (!session?.authenticated) {
      window.location.assign(
        googleSignInUrl(`/buy-credits?returnTo=${encodeURIComponent(returnTo)}`),
      )
      return
    }
    submitting.current = true
    setBusy(packId)
    setError('')
    try {
      const key = `tuneclue:checkout:${session.user.id}:${packId}`
      let requestId: string | undefined = requestIds.current[packId]
      if (!requestId) {
        try {
          requestId = sessionStorage.getItem(key) || undefined
        } catch {
          /* Storage may be disabled. */
        }
        requestId = requestId ?? crypto.randomUUID()
        requestIds.current[packId] = requestId
        try {
          sessionStorage.setItem(key, requestId)
        } catch {
          /* The in-memory lock still works. */
        }
      }
      const result = await billingRequest<{
        ok: true
        checkoutUrl: string | null
        order: PublicOrder
      }>('/api/billing/checkout', { packId, requestId, returnTo })
      // Reset only after the server returned an owned order. Network errors retain the request ID.
      try {
        sessionStorage.removeItem(key)
      } catch {
        /* Best effort. */
      }
      delete requestIds.current[packId]
      if (result.checkoutUrl) {
        const url = new URL(result.checkoutUrl)
        if (
          url.protocol !== 'https:' ||
          !['checkout.dodopayments.com', 'test.checkout.dodopayments.com'].includes(url.hostname)
        )
          throw new Error('Checkout could not be verified.')
        window.location.assign(url.toString())
      } else {
        window.location.assign(`/billing/return?order=${encodeURIComponent(result.order.id)}`)
      }
    } catch (cause) {
      if (cause instanceof BillingError && cause.status === 401) {
        window.location.assign(
          googleSignInUrl(`/buy-credits?returnTo=${encodeURIComponent(returnTo)}`),
        )
        return
      }
      setError(
        cause instanceof Error
          ? cause.message
          : 'Checkout could not start. Check your account before trying again.',
      )
      setBusy(undefined)
      submitting.current = false
    }
  }

  return (
    <main className="tc-page tc-billing-page">
      <a className="tc-back" href={returnTo}>
        <ArrowLeft size={14} aria-hidden="true" />
        Back
      </a>
      <p className="tc-page-kicker mt-5">TuneClue credits</p>
      <h1 className="tc-page-title">More songs. No subscription.</h1>
      <p className="tc-page-lede">
        Choose a one-time pack when you need more song searches. One credit runs one recognition
        attempt. A match is not guaranteed.
      </p>
      {catalog?.environment === 'test_mode' && catalog.available ? (
        <output className="tc-billing-banner">
          Test checkout only. Use Dodo test payment details. Test credits cannot run real song
          recognition.
        </output>
      ) : null}
      {session?.authenticated ? (
        <p className="tc-billing-account">
          Signed in as <strong>{session.user.email}</strong> · {session.credits} recognition credits
        </p>
      ) : null}
      {error ? (
        <p className="tc-billing-error" role="alert">
          {error}
        </p>
      ) : null}
      {!catalog && !error ? <output>Loading credit packs…</output> : null}
      {catalog && !catalog.available ? (
        <section className="tc-billing-notice">
          <LockKeyhole size={26} aria-hidden="true" />
          <h2>Credit purchases are not available yet</h2>
          <p>
            No payment will be requested. You can still use any available free recognition credits.
          </p>
          <a className="tc-header-signin" href="/account">
            View account
          </a>
        </section>
      ) : null}
      {catalog?.available ? (
        <>
          <div className="tc-billing-packs">
            {catalog.packs.map((pack) => (
              <article className="tc-billing-pack" key={pack.id}>
                <p className="tc-page-kicker">{pack.name}</p>
                <h2>
                  {pack.credits} <span>credits</span>
                </h2>
                <p className="tc-billing-price">
                  {money(pack.amount, pack.currency)} <small>USD · one time</small>
                </p>
                <p className="tc-billing-detail">
                  <Check size={16} aria-hidden="true" />
                  No automatic renewal
                </p>
                <p className="tc-billing-detail">
                  <Check size={16} aria-hidden="true" />
                  Credits stay in this TuneClue account
                </p>
                <p className="tc-billing-detail">
                  <Check size={16} aria-hidden="true" />
                  No scheduled credit expiry
                </p>
                <button
                  type="button"
                  className="tc-primary-action"
                  disabled={!accepted || Boolean(busy) || !session?.available}
                  onClick={() => purchase(pack.id)}
                >
                  <CreditCard size={16} aria-hidden="true" />
                  {busy === pack.id
                    ? 'Opening checkout…'
                    : session?.authenticated
                      ? `Buy ${pack.credits} credits`
                      : 'Sign in to buy'}
                </button>
              </article>
            ))}
          </div>
          <label className="tc-billing-consent">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>
              I understand that an attempted recognition uses one credit even when no song is found,
              and I agree to the{' '}
              <a href="/terms-of-service" target="_blank" rel="noreferrer">
                Terms
              </a>{' '}
              and{' '}
              <a href="/privacy-policy" target="_blank" rel="noreferrer">
                Privacy Policy
              </a>
              .
            </span>
          </label>
          <p className="tc-billing-footnote">
            Checkout is handled by Dodo Payments. Applicable tax is calculated at checkout. Card
            details are not stored by TuneClue. Only a confirmed payment adds credits.
          </p>
          {!session?.available && session ? (
            <p className="tc-billing-error">
              Sign-in is temporarily unavailable. Purchases are paused.
            </p>
          ) : null}
        </>
      ) : null}
      <section className="tc-billing-rules" aria-labelledby={rulesHeadingId}>
        <h2 id={rulesHeadingId}>Before you buy</h2>
        <p>
          A completed recognition attempt uses one credit whether a match is found or not. Invalid
          inputs do not use a credit. Provider or system failures should not consume a credit;
          contact support if a return is missing.
        </p>
        <p>
          For a duplicate charge, missing credits, or a refund request, contact{' '}
          <a href="mailto:support@tuneclue.com">support@tuneclue.com</a> with your order number.
          Approved refunds reverse the corresponding credits; statutory rights are unaffected. Dodo
          processes the money refund, while TuneClue updates the credit balance.
        </p>
        <p>
          Partial refunds reverse a proportional number of credits, rounded up cumulatively.
          Reversed credits may leave a negative balance if they have already been used. Disputed
          purchases are held until resolution.
        </p>
        <a className="tc-back" href="/earn-credits">
          See remaining free-credit rewards →
        </a>
      </section>
    </main>
  )
}
