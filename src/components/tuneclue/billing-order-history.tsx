import { useEffect, useId, useState } from 'react'
import { billingRequest, money } from '@/lib/billing/client'
import type { PublicOrder } from '@/lib/billing/types'
import './billing.css'

export function BillingOrderHistory() {
  const headingId = useId()
  const [data, setData] = useState<{ orders: PublicOrder[]; testCredits: number }>()
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    billingRequest<{ orders: PublicOrder[]; testCredits: number }>(
      '/api/billing/orders',
      undefined,
      controller.signal,
    )
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setError('Order history is temporarily unavailable.')
      })
    return () => controller.abort()
  }, [])
  return (
    <section className="tc-billing-history" aria-labelledby={headingId}>
      <h2 id={headingId}>Credit purchases</h2>
      {error ? (
        <output>{error}</output>
      ) : !data ? (
        <output>Loading orders…</output>
      ) : (
        <>
          {data.testCredits !== 0 ? (
            <p className="tc-billing-banner">
              Test balance: {data.testCredits} credits. Separate from your spendable recognition
              credits.
            </p>
          ) : null}
          {!data.orders.length ? (
            <p>No credit purchases yet.</p>
          ) : (
            <ul className="tc-billing-orders">
              {data.orders.map((order) => (
                <li key={order.id}>
                  <div>
                    <strong>{order.packName}</strong>
                    <p>
                      {order.credits} credits ·{' '}
                      {money(order.paidAmount ?? order.amount, order.currency)} ·{' '}
                      {order.environment === 'test_mode' ? 'Test order' : 'Live order'}
                    </p>
                    <small>
                      {new Date(order.createdAt).toLocaleDateString('en-US')} ·{' '}
                      {order.status.replaceAll('_', ' ')}
                    </small>
                  </div>
                  <a
                    className="tc-header-signin"
                    href={`/billing/return?order=${encodeURIComponent(order.id)}`}
                  >
                    View order
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
