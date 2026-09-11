import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAuthSession, googleSignInUrl } from '@/lib/auth/client'
import { billingRequest, money } from '@/lib/billing/client'
import type { PublicOrder } from '@/lib/billing/types'
import { BillingError } from '@/lib/billing/types'
import './billing.css'

export function BillingReturnPage() {
  const [orderId, setOrderId] = useState('')
  const [order, setOrder] = useState<PublicOrder>()
  const [error, setError] = useState('')
  const [authRequired, setAuthRequired] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const checking = useRef(false)

  const refresh = useCallback(async (id: string, reconcile = false) => {
    if (checking.current) return
    checking.current = true
    setBusy(true)
    try {
      const data = reconcile
        ? await billingRequest<{ order: PublicOrder }>('/api/billing/reconcile', { orderId: id })
        : await billingRequest<{ order: PublicOrder }>(
            `/api/billing/order?id=${encodeURIComponent(id)}`,
          )
      setOrder(data.order)
      setError('')
      if (['paid', 'partially_refunded', 'refunded', 'disputed'].includes(data.order.status)) {
        window.dispatchEvent(new Event('tuneclue:credits-changed'))
      }
    } catch (cause) {
      if (cause instanceof BillingError && cause.status === 401) setAuthRequired(true)
      else setError(cause instanceof Error ? cause.message : 'Order status could not be loaded.')
    } finally {
      checking.current = false
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    const id = url.searchParams.get('order') || ''
    setCancelled(url.searchParams.get('cancelled') === '1')
    // Drop provider-appended status, payment_id, email, and license data. None authorizes fulfillment.
    window.history.replaceState(
      window.history.state,
      '',
      `/billing/return${id ? `?order=${encodeURIComponent(id)}` : ''}`,
    )
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
      setError('An order number is required. Open your order from Account.')
      return
    }
    setOrderId(id)
    let disposed = false
    fetchAuthSession()
      .then(async (session) => {
        if (disposed) return
        if (!session.authenticated) {
          setAuthRequired(true)
          return
        }
        await refresh(id)
        if (!disposed) await refresh(id, true)
      })
      .catch(() => {
        if (!disposed) setError('Sign-in could not be checked. Refresh this page.')
      })
    return () => {
      disposed = true
    }
  }, [refresh])

  const orderStatus = order?.status
  useEffect(() => {
    if (!orderId || authRequired || (orderStatus && !['creating', 'pending'].includes(orderStatus)))
      return
    let attempts = 0
    const interval = window.setInterval(() => {
      attempts += 1
      if (attempts > 15) {
        clearInterval(interval)
        setWaiting(true)
        return
      }
      void refresh(orderId, attempts % 5 === 0)
    }, 3000)
    return () => clearInterval(interval)
  }, [orderId, orderStatus, authRequired, refresh])

  const fulfilled = order && ['paid', 'partially_refunded'].includes(order.status)
  return (
    <main className="tc-page tc-billing-page">
      <p className="tc-page-kicker">TuneClue checkout</p>
      <h1 className="tc-page-title">
        {fulfilled
          ? order.environment === 'test_mode'
            ? 'Test purchase confirmed'
            : 'Your credits are ready'
          : order?.status === 'refunded'
            ? 'Payment refunded'
            : order?.status === 'review' || order?.status === 'disputed'
              ? 'Payment needs attention'
              : 'Payment status'}
      </h1>
      <p className="tc-page-lede">
        This page shows your server-confirmed order. Returning from checkout alone does not add
        credits.
      </p>
      {authRequired ? (
        <section className="tc-billing-notice">
          <h2>Sign in to view this order</h2>
          <p>Use the same Google account that started the purchase.</p>
          <a
            className="tc-header-signin"
            href={googleSignInUrl(`/billing/return?order=${encodeURIComponent(orderId)}`)}
          >
            Continue with Google
          </a>
        </section>
      ) : null}
      {error ? (
        <p role="alert" className="tc-billing-error">
          {error}
        </p>
      ) : null}
      {order ? (
        <section className="tc-billing-notice" aria-live="polite">
          <h2>{order.packName}</h2>
          <p>
            {order.credits} credits · {money(order.paidAmount ?? order.amount, order.currency)}
          </p>
          <p>
            <strong>Status:</strong> {order.status.replaceAll('_', ' ')}
            {order.environment === 'test_mode' ? ' · TEST' : ''}
          </p>
          <p className="tc-billing-order-id">Order: {order.id}</p>
          {order.environment === 'test_mode' ? (
            <p className="tc-billing-banner">
              Test credits are stored separately. They do not increase your real recognition
              balance.
            </p>
          ) : null}
          {order.refundedAmount > 0 ? (
            <p>
              Refunded: {money(order.refundedAmount, order.currency)}. This pack currently retains{' '}
              {order.retainedCredits} credits before recognition usage.
            </p>
          ) : null}
          {order.status === 'review' || order.status === 'disputed' ? (
            <p>Contact support with this order number. Do not pay again to resolve this order.</p>
          ) : null}
          {['checkout_failed', 'failed', 'cancelled'].includes(order.status) ? (
            <p>
              Checkout did not complete successfully. Check your payment records before starting a
              new purchase.
            </p>
          ) : null}
          {['creating', 'pending'].includes(order.status) ? (
            <p>
              {cancelled
                ? 'You returned from checkout. No cancellation or payment is assumed until it is confirmed.'
                : 'Waiting for payment confirmation. Do not pay again while this order is pending.'}
            </p>
          ) : null}
          <div className="tc-billing-actions">
            {fulfilled && order.environment === 'live_mode' ? (
              <a className="tc-primary-action" href={order.returnTo}>
                Continue in TuneClue →
              </a>
            ) : null}
            <a className="tc-header-signin" href="/account">
              View account
            </a>
            <button
              className="tc-header-signin"
              type="button"
              disabled={busy}
              onClick={() => refresh(orderId, true)}
            >
              {busy ? 'Checking…' : 'Check status'}
            </button>
          </div>
        </section>
      ) : !authRequired && !error ? (
        <output>Checking your order…</output>
      ) : null}
      {waiting ? (
        <output>
          Confirmation is taking longer than expected. Your order is saved; check again later or
          contact support. You do not need to pay again.
        </output>
      ) : null}
      <p className="tc-billing-footnote">
        For help, email <a href="mailto:support@tuneclue.com">support@tuneclue.com</a> with the
        order number. Never send card details.
      </p>
    </main>
  )
}
