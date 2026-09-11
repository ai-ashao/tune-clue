import { type ReactNode, useCallback, useEffect, useState } from 'react'
import type { Page } from '@/lib/admin/types'
import { AdminApiError, adminRequest, describeError } from './client'

export function useAdminData<T>(path: string, body?: unknown) {
  const [state, setState] = useState<{
    data?: T
    error?: unknown
    loading: boolean
    dataAsOf?: number
  }>({ loading: true })
  const [revision, setRevision] = useState(0)
  const serialized = body === undefined ? undefined : JSON.stringify(body)
  useEffect(() => {
    void revision
    const controller = new AbortController()
    setState({ loading: true })
    let dataAsOf: number | undefined
    adminRequest<T>(
      path,
      serialized === undefined ? undefined : JSON.parse(serialized),
      controller.signal,
      (time) => {
        dataAsOf = time
      },
    )
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, dataAsOf })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ error, loading: false })
      })
    return () => controller.abort()
  }, [path, serialized, revision])
  const refresh = useCallback(() => setRevision((v) => v + 1), [])
  return { ...state, refresh }
}
export function ErrorBox({ error }: { error: unknown }) {
  const reauth = error instanceof AdminApiError && error.status === 401
  return (
    <div className="ta-alert" role="alert">
      <p>{describeError(error)}</p>
      {error instanceof AdminApiError && error.traceId ? (
        <small>
          追踪编号：<code>{error.traceId}</code>
        </small>
      ) : null}
      {reauth ? <a href="/api/auth/google?returnTo=%2Fadmin">重新使用 Google 登录</a> : null}
    </div>
  )
}
export function Loading() {
  return <output className="ta-muted">正在读取服务端记录…</output>
}
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ta-panel">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
export function PageTitle({
  title,
  description,
  onRefresh,
  dataAsOf,
}: {
  title: string
  description: string
  onRefresh?: () => void
  dataAsOf?: number
}) {
  return (
    <div className="ta-title">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
        {dataAsOf ? <small className="ta-muted">数据生成于 {utc(dataAsOf)}</small> : null}
      </div>
      {onRefresh ? (
        <button type="button" onClick={onRefresh}>
          刷新
        </button>
      ) : null}
    </div>
  )
}
export function Empty({ text = '没有符合条件的记录。' }: { text?: string }) {
  return <p className="ta-empty">{text}</p>
}
export function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <section className="ta-table-scroll" aria-label="数据表，可横向滚动">
      <table>
        <thead>
          <tr>
            {headers.map((title) => (
              <th scope="col" key={title}>
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </section>
  )
}
export function Pager({
  nextCursor,
  previous,
  onNext,
  onPrevious,
}: {
  nextCursor: string | null
  previous: boolean
  onNext: (cursor: string) => void
  onPrevious: () => void
}) {
  return (
    <div className="ta-pager">
      <button type="button" disabled={!previous} onClick={onPrevious}>
        上一页
      </button>
      <span className="ta-muted">每页最多 30 条</span>
      <button
        type="button"
        disabled={!nextCursor}
        onClick={() => {
          if (nextCursor) onNext(nextCursor)
        }}
      >
        下一页
      </button>
    </div>
  )
}
export function useCursor(resetKey: string) {
  const [cursors, setCursors] = useState<string[]>([])
  useEffect(() => {
    void resetKey
    setCursors([])
  }, [resetKey])
  return {
    cursor: cursors.at(-1),
    previous: cursors.length > 0,
    onNext: (value: string) => setCursors((old) => [...old, value]),
    onPrevious: () => setCursors((old) => old.slice(0, -1)),
  }
}
export function PageResult<T>({
  state,
  children,
}: {
  state: { data?: Page<T>; loading: boolean; error?: unknown }
  children: (data: Page<T>) => ReactNode
}) {
  if (state.loading) return <Loading />
  if (state.error) return <ErrorBox error={state.error} />
  if (!state.data) return <Empty />
  return <>{children(state.data)}</>
}
const labels: Record<string, string> = {
  live_mode: '正式付款',
  test_mode: '测试付款',
  spendable: '可消费账本',
  all: '全部环境',
  unconfigured: '尚未配置',
  paid: '已付款',
  pending: '待确认',
  creating: '创建中',
  checkout_failed: '收银台创建异常',
  failed: '失败',
  cancelled: '已取消',
  partially_refunded: '部分退款',
  refunded: '已退款',
  disputed: '争议中',
  review: '待复核',
  not_granted: '尚未发放',
  consistent: '权益一致',
  missing: '权益待补齐',
  excess: '权益超额待核查',
  unexpected: '异常发放',
  running: '处理中',
  matched: '匹配成功',
  no_match: '正常未匹配',
  system_error: '技术失败',
  indeterminate: '结果不明',
  rejected: '未受理',
  local_file: '本地文件',
  tiktok_url: 'TikTok 链接',
  processed: '已处理',
  ignored: '未使用事件',
  succeeded: '已完成',
  no_change: '未改变',
  started: '开始',
  accepted: '已接受',
  charged: '已扣次',
  source: '来源处理',
  provider: '上游请求',
  persisted: '结果已保存',
  finished: '已结束',
  welcome_bonus: '欢迎奖励',
  share_bonus: '分享奖励',
  recognition: '识别扣次',
  refund: '识别异常返还',
  purchase: '购买次数',
  adjustment: '支付权益调整',
  auto_credit_return: '自动返还',
  manual_credit_return: '人工补回',
}
export function label(value: string | null | undefined) {
  return value ? labels[value] || value : '—'
}
export function Badge({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={`ta-badge ${value && ['review', 'missing', 'excess', 'unexpected', 'system_error', 'indeterminate', 'failed', 'checkout_failed'].includes(value) ? 'ta-badge-warning' : ''}`}
    >
      {label(value)}
    </span>
  )
}
export function utc(value: number | null | undefined) {
  return value === null || value === undefined
    ? '—'
    : new Date(value)
        .toISOString()
        .replace('T', ' ')
        .replace('.000Z', ' UTC')
        .replace(/\.\d{3}Z$/, ' UTC')
}
export function money(value: number | null | undefined, currency = 'USD') {
  return value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value / 100)
}
export function ResourceLink({
  kind,
  id,
}: {
  kind: 'users' | 'orders' | 'recognitions'
  id: string
}) {
  return (
    <a className="ta-id" href={`/admin/${kind}/${encodeURIComponent(id)}`} title={id}>
      {id}
    </a>
  )
}
export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="ta-facts">
      {items.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
export function TimeFilter({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (key: 'from' | 'to', value: string) => void
}) {
  return (
    <>
      <label>
        开始日期（UTC）
        <input type="date" value={from} onChange={(e) => onChange('from', e.target.value)} />
      </label>
      <label>
        结束日期（UTC，含当日）
        <input type="date" value={to} onChange={(e) => onChange('to', e.target.value)} />
      </label>
    </>
  )
}
export function dates(from: string, to: string) {
  return {
    from: from ? Date.parse(`${from}T00:00:00Z`) : undefined,
    to: to ? Date.parse(`${to}T00:00:00Z`) + 86_400_000 : undefined,
  }
}
