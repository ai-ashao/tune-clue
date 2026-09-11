import { useState } from 'react'
import type { EventView, OrderView, Page } from '@/lib/admin/types'
import { ActionConfirmDialog } from './action-confirm-dialog'
import { useAdminSession } from './admin-shell'
import { AuditTimeline } from './audit-timeline'
import { queryString } from './client'
import {
  Badge,
  DataTable,
  dates,
  Empty,
  ErrorBox,
  Facts,
  Loading,
  money,
  PageResult,
  Pager,
  PageTitle,
  Panel,
  ResourceLink,
  TimeFilter,
  useAdminData,
  useCursor,
  utc,
} from './shared'

function params() {
  return typeof window === 'undefined'
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search)
}
export function PaymentEvents({
  orderId,
  environment = 'all',
  issue,
}: {
  orderId?: string
  environment?: string
  issue?: string
}) {
  const pager = useCursor(`${orderId}:${environment}:${issue}`)
  const state = useAdminData<Page<EventView>>(
    `payment-events${queryString({ orderId, environment, issue, cursor: pager.cursor })}`,
  )
  return (
    <PageResult state={state}>
      {(page) => (
        <>
          {page.items.length ? (
            <DataTable
              headers={['通知编号', '订单', '环境', '历史状态', '当前处理情况', '收到时间（UTC）']}
            >
              {page.items.map((e) => (
                <tr key={`${e.environment}:${e.event_id}`}>
                  <td>
                    <code>{e.event_id}</code>
                    <div className="ta-muted">{e.event_type}</div>
                  </td>
                  <td>
                    {e.order_id ? (
                      <ResourceLink kind="orders" id={e.order_id} />
                    ) : (
                      <span>
                        未关联订单
                        <br />
                        <small>到 Dodo 按通知编号核查</small>
                      </span>
                    )}
                  </td>
                  <td>
                    <Badge value={e.environment} />
                  </td>
                  <td>
                    <Badge value={e.state} />
                    <div>{e.reason}</div>
                  </td>
                  <td>
                    {e.active ? (
                      '仍需核查'
                    ) : e.covering_event_id ? (
                      <span>
                        已由后续核对覆盖
                        <small className="ta-summary">
                          <br />
                          {e.covering_event_id}
                          <br />
                          {utc(e.covered_at)}
                        </small>
                      </span>
                    ) : (
                      '无当前异常'
                    )}
                  </td>
                  <td>{utc(e.received_at)}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <Empty />
          )}
          <Pager {...pager} nextCursor={page.nextCursor} />
        </>
      )}
    </PageResult>
  )
}
export function AdminOrdersPage() {
  const [initial] = useState(params)
  const [view, setView] = useState(initial.get('view') === 'events' ? 'events' : 'orders')
  const [environment, setEnvironment] = useState(initial.get('environment') || 'live_mode')
  const [status, setStatus] = useState('')
  const [issue, setIssue] = useState(initial.get('issue') || '')
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const fixed = {
    userId: initial.get('userId') || undefined,
    confirmed: initial.get('confirmed') || undefined,
    from: from ? dates(from, to).from : initial.get('from') || undefined,
    to: to ? dates(from, to).to : initial.get('to') || undefined,
  }
  const pager = useCursor(JSON.stringify({ environment, status, issue, q, ...fixed }))
  const state = useAdminData<Page<OrderView>>(
    `orders${queryString({ environment, status, issue: issue === 'entitlement' || issue === 'review' || issue === 'active' ? issue : undefined, q, ...fixed, cursor: pager.cursor })}`,
  )
  return (
    <>
      <PageTitle
        dataAsOf={state.dataAsOf}
        title="订单与支付异常"
        description="付款事实、订单权益和用户余额分别核对。真实资金退款请到 Dodo 后台处理。"
        onRefresh={state.refresh}
      />
      <div className="ta-tabs">
        <button type="button" aria-pressed={view === 'orders'} onClick={() => setView('orders')}>
          订单
        </button>
        <button type="button" aria-pressed={view === 'events'} onClick={() => setView('events')}>
          支付通知异常 / 历史
        </button>
      </div>
      <form
        className="ta-filters"
        onSubmit={(e) => {
          e.preventDefault()
          setQ(input.trim())
        }}
      >
        <label>
          支付环境
          <select value={environment} onChange={(e) => setEnvironment(e.target.value)}>
            <option value="live_mode">正式</option>
            <option value="test_mode">测试</option>
            <option value="all">全部（各自独立）</option>
          </select>
        </label>
        <label>
          异常筛选
          <select value={issue} onChange={(e) => setIssue(e.target.value)}>
            <option value="">全部记录</option>
            <option value="active">当前待核查</option>
            {view === 'orders' ? (
              <>
                <option value="review">订单待复核</option>
                <option value="entitlement">权益不一致</option>
              </>
            ) : null}
          </select>
        </label>
        {view === 'orders' ? (
          <>
            <label>
              状态
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">全部状态</option>
                {[
                  'creating',
                  'pending',
                  'checkout_failed',
                  'paid',
                  'review',
                  'partially_refunded',
                  'refunded',
                  'disputed',
                  'failed',
                  'cancelled',
                ].map((v) => (
                  <option value={v} key={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              订单 / Payment / Checkout / 用户 ID
              <input
                type="search"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={160}
              />
            </label>
            <TimeFilter
              from={from}
              to={to}
              onChange={(key, value) => (key === 'from' ? setFrom(value) : setTo(value))}
            />
            <button type="submit">查询</button>
          </>
        ) : null}
      </form>
      {fixed.confirmed ? (
        <p className="ta-notice">仅显示区间内首次确认的正式付款，按 paid_at 筛选，不等于净收入。</p>
      ) : null}
      {view === 'events' ? (
        <PaymentEvents environment={environment} issue={issue ? 'active' : undefined} />
      ) : (
        <PageResult state={state}>
          {(page) => (
            <>
              {page.items.length ? (
                <DataTable
                  headers={[
                    '订单 / 用户',
                    '套餐快照',
                    '金额',
                    '业务状态',
                    '订单权益',
                    '环境',
                    '创建时间（UTC）',
                  ]}
                >
                  {page.items.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <ResourceLink kind="orders" id={o.id} />
                        <br />
                        <ResourceLink kind="users" id={o.user_id} />
                      </td>
                      <td>
                        {o.pack_name}
                        <br />
                        {o.credits} 次
                      </td>
                      <td>{money(o.amount, o.currency)}</td>
                      <td>
                        <Badge value={o.status} />
                      </td>
                      <td>
                        <Badge value={o.consistency} />
                        <br />
                        <small>
                          净发放 {o.ledger_net} / 目标 {o.target_credits}
                        </small>
                      </td>
                      <td>
                        <Badge value={o.environment} />
                      </td>
                      <td>{utc(o.created_at)}</td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <Empty />
              )}
              <Pager {...pager} nextCursor={page.nextCursor} />
            </>
          )}
        </PageResult>
      )}
    </>
  )
}
function RelatedRecords({ orderId, kind }: { orderId: string; kind: 'refunds' | 'disputes' }) {
  const pager = useCursor(`${orderId}:${kind}`)
  const state = useAdminData<Page<Record<string, string | number>>>(
    `orders/${orderId}/${kind}${queryString({ cursor: pager.cursor })}`,
  )
  return (
    <Panel title={kind === 'refunds' ? '退款记录' : '争议记录'}>
      <p className="ta-muted">按提供商资源编号排序。退款发生时间未采集，不编造时间。</p>
      <PageResult state={state}>
        {(page) => (
          <>
            {page.items.length ? (
              <DataTable headers={['提供商编号', '状态', '金额 / 币种']}>
                {page.items.map((r) => (
                  <tr key={String(r.refund_id || r.dispute_id)}>
                    <td>
                      <code>{r.refund_id || r.dispute_id}</code>
                    </td>
                    <td>{kind === 'refunds' ? '已成功退款' : String(r.status)}</td>
                    <td>
                      {typeof r.amount === 'number'
                        ? money(r.amount, String(r.currency || 'USD'))
                        : '—'}
                    </td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <Empty />
            )}
            <Pager {...pager} nextCursor={page.nextCursor} />
          </>
        )}
      </PageResult>
    </Panel>
  )
}
export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const state = useAdminData<OrderView>(`orders/${orderId}`)
  const order = state.data
  const session = useAdminSession()
  const [revision, setRevision] = useState(0)
  const [copied, setCopied] = useState(false)
  function complete() {
    state.refresh()
    setRevision((v) => v + 1)
  }
  const mismatch = order && order.environment !== session?.provider.environment
  return (
    <>
      <a href="/admin/orders">← 订单目录</a>
      <PageTitle
        dataAsOf={state.dataAsOf}
        title="订单详情"
        description="同一订单的权益净发放，不等于用户当前余额。"
        onRefresh={complete}
      />
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorBox error={state.error} />
      ) : order ? (
        <>
          <p>
            <code>{order.id}</code> <Badge value={order.environment} />{' '}
            <Badge value={order.status} />
          </p>
          {order.review_reason ? (
            <div className="ta-alert">待复核原因：{order.review_reason}</div>
          ) : null}
          <div className="ta-columns">
            <Panel title="1 · 资金事实">
              <Facts
                items={[
                  ['原订单金额', money(order.amount, order.currency)],
                  ['已确认付款金额（含适用税费）', money(order.paid_amount, order.currency)],
                  ['本站首次确认时间', utc(order.paid_at)],
                  ['累计已确认退款', money(order.refunded_amount, order.currency)],
                  ['Payment ID', <code key="pid">{order.payment_id || '—'}</code>],
                  ['最近复核尝试', utc(order.last_reconcile_at || null)],
                ]}
              />
              <p className="ta-muted">不是银行到账时间；最近尝试不代表上游查询成功。</p>
            </Panel>
            <Panel title="2 · 订单权益">
              <Facts
                items={[
                  ['套餐快照', order.pack_name],
                  ['原包次数', order.credits],
                  ['退款/争议后目标权益', order.target_credits],
                  ['此订单账本净发放', order.ledger_net],
                  ['一致性', <Badge key="badge" value={order.consistency} />],
                ]}
              />
            </Panel>
            <Panel title="3 · 用户账户">
              <Facts
                items={[
                  ['所属账户', <ResourceLink key="user" kind="users" id={order.user_id} />],
                  ['当前可消费余额', order.user_balance ?? '—'],
                  [
                    '订单所属账本',
                    order.environment === 'test_mode' ? '独立测试付款账本' : '可消费账本',
                  ],
                ]}
              />
              <p className="ta-muted">
                测试订单永远不会增加真实识别余额。购买 20 次、使用 5 次，订单权益仍可为 20。
              </p>
            </Panel>
          </div>
          <div className="ta-actions">
            <ActionConfirmDialog
              action="reconcile_order"
              targetId={orderId}
              summary={`订单 ${order.id}\n用户 ${order.user_id}\n${order.environment} · 当前净发放 ${order.ledger_net}，目标 ${order.target_credits}`}
              disabled={Boolean(mismatch) || !order.checkout_session_id}
              disabledReason={
                mismatch ? '订单与当前提供商环境不同' : '缺少 checkout session，不能站内复核'
              }
              onComplete={complete}
            />
            {order.payment_id ? (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    .writeText(order.payment_id as string)
                    .then(() => setCopied(true))
                    .catch(() => setCopied(false))
                }}
              >
                {copied ? '已复制 Payment ID' : '复制 Payment ID'}
              </button>
            ) : null}
            <a href="https://app.dodopayments.com" target="_blank" rel="noopener noreferrer">
              Dodo 后台 ↗
            </a>
          </div>
          <Panel title="支付通知历史">
            <PaymentEvents key={`events-${revision}`} orderId={orderId} />
          </Panel>
          <RelatedRecords key={`refunds-${revision}`} orderId={orderId} kind="refunds" />
          <RelatedRecords key={`disputes-${revision}`} orderId={orderId} kind="disputes" />
          <AuditTimeline
            key={`audit-${revision}`}
            targetType="order"
            targetId={orderId}
            revision={revision}
          />
        </>
      ) : null}
    </>
  )
}
