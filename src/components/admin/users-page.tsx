import { useState } from 'react'
import type { CreditView, Page, UserView } from '@/lib/admin/types'
import { queryString } from './client'
import {
  Badge,
  DataTable,
  Empty,
  ErrorBox,
  Facts,
  Loading,
  PageResult,
  Pager,
  PageTitle,
  Panel,
  ResourceLink,
  useAdminData,
  useCursor,
  utc,
} from './shared'

function initialParams() {
  return typeof window === 'undefined'
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search)
}
export function AdminUsersPage() {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [times] = useState(() => {
    const p = initialParams()
    return { from: p.get('from') || undefined, to: p.get('to') || undefined }
  })
  const pager = useCursor(q)
  const state = useAdminData<Page<UserView>>('users/search', { q, cursor: pager.cursor, ...times })
  return (
    <>
      <PageTitle
        dataAsOf={state.dataAsOf}
        title="用户与次数"
        description="按完整邮箱或本站用户 ID 精确搜索。邮箱仅通过 POST 发送，不进入地址栏。"
        onRefresh={state.refresh}
      />
      <form
        className="ta-filters"
        onSubmit={(e) => {
          e.preventDefault()
          setQ(input.trim())
        }}
      >
        <label>
          完整邮箱 / 用户 ID
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={320}
            placeholder="完整邮箱或用户 ID"
          />
        </label>
        <button type="submit">搜索</button>
        <button
          type="button"
          onClick={() => {
            setInput('')
            setQ('')
          }}
        >
          清空
        </button>
      </form>
      {times.from ? (
        <p className="ta-muted">
          注册区间：{utc(Number(times.from))} 至 {utc(Number(times.to))}（不含结束时刻）。
        </p>
      ) : null}
      <PageResult state={state}>
        {(page) => (
          <>
            {page.items.length ? (
              <DataTable
                headers={['用户', '名称', '可消费余额', '测试付款余额', '注册时间（UTC）']}
              >
                {page.items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <ResourceLink kind="users" id={u.id} />
                      <div>{u.email}</div>
                    </td>
                    <td>{u.name || '—'}</td>
                    <td>{u.balance}</td>
                    <td>{u.test_balance}</td>
                    <td>{utc(u.created_at)}</td>
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
    </>
  )
}
function CreditHistory({ userId }: { userId: string }) {
  const [ledger, setLedger] = useState('spendable')
  const pager = useCursor(`${userId}:${ledger}`)
  const state = useAdminData<Page<CreditView>>(
    `users/${userId}/credits${queryString({ ledger, cursor: pager.cursor })}`,
  )
  return (
    <Panel title="次数账本">
      <div className="ta-tabs">
        <button
          type="button"
          aria-pressed={ledger === 'spendable'}
          onClick={() => setLedger('spendable')}
        >
          可消费账本
        </button>
        <button type="button" aria-pressed={ledger === 'test'} onClick={() => setLedger('test')}>
          测试付款账本
        </button>
      </div>
      <PageResult state={state}>
        {(page) => (
          <>
            {page.items.length ? (
              <DataTable headers={['时间（UTC）', '类型', '变化', '关联业务', '幂等编号']}>
                {page.items.map((c) => (
                  <tr key={c.id}>
                    <td>{utc(c.created_at)}</td>
                    <td>
                      <Badge value={c.type} />
                    </td>
                    <td>
                      {c.delta > 0 ? '+' : ''}
                      {c.delta}
                    </td>
                    <td>
                      {c.reference_id ? (
                        c.has_attempt ? (
                          <ResourceLink kind="recognitions" id={c.reference_id} />
                        ) : c.idempotency_key.startsWith('dodo:') ? (
                          <ResourceLink kind="orders" id={c.reference_id} />
                        ) : (
                          <code>
                            {c.reference_id} {c.type === 'recognition' ? '（历史日志不完整）' : ''}
                          </code>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <code>{c.idempotency_key}</code>
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
export function AdminUserDetail({ userId }: { userId: string }) {
  const state = useAdminData<UserView>(`users/${userId}`)
  const user = state.data
  return (
    <>
      <a href="/admin/users">← 用户目录</a>
      <PageTitle
        dataAsOf={state.dataAsOf}
        title="用户详情"
        description="余额按账本求和。负余额如实保留；不能在后台直接覆盖。"
        onRefresh={state.refresh}
      />
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorBox error={state.error} />
      ) : user ? (
        <>
          <Panel title="账户与余额">
            <Facts
              items={[
                ['用户 ID', <code key="id">{user.id}</code>],
                ['邮箱', user.email],
                ['名称', user.name || '—'],
                ['注册时间', utc(user.created_at)],
                ['可消费余额', user.balance],
                ['测试付款余额（不可识别）', user.test_balance],
                ['最近已记录识别', utc(user.last_recognition_at)],
              ]}
            />
          </Panel>
          {user.legacy_attempts ? (
            <p className="ta-notice">
              有 {user.legacy_attempts}{' '}
              条旧识别扣次缺少请求日志，只能核查流水，不能推断结果或直接补回。
            </p>
          ) : null}
          <div className="ta-actions">
            <a href={`/admin/orders${queryString({ userId, environment: 'all' })}`}>
              查看此用户订单
            </a>
            <a href={`/admin/recognitions${queryString({ userId })}`}>查看此用户识别请求</a>
          </div>
          <CreditHistory userId={userId} />
        </>
      ) : null}
    </>
  )
}
