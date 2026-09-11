import type { AuditView, Page } from '@/lib/admin/types'
import { queryString } from './client'
import { Badge, Empty, PageResult, Pager, Panel, useAdminData, useCursor, utc } from './shared'
export function AuditTimeline({
  targetType,
  targetId,
  revision = 0,
}: {
  targetType: 'order' | 'recognition'
  targetId: string
  revision?: number
}) {
  const pager = useCursor(`${targetType}:${targetId}:${revision}`)
  const state = useAdminData<Page<AuditView>>(
    `audit${queryString({ targetType, targetId, cursor: pager.cursor })}`,
  )
  // Parent key=revision remounts this panel after an operation.
  return (
    <Panel title="管理员处理历史">
      <PageResult state={state}>
        {(page) => (
          <>
            {page.items.length ? (
              <ol className="ta-audit">
                {page.items.map((item) => (
                  <li key={item.id}>
                    <Badge value={item.event_kind} /> <small>{utc(item.created_at)}</small>
                    <p>{item.reason_text}</p>
                    <small>
                      操作者：<code>{item.actor_user_id}</code> · 操作：
                      <code>{item.operation_id}</code>
                    </small>
                    {item.result_code ? <p>结果：{item.result_code}</p> : null}
                    {item.before_json || item.after_json ? (
                      <details>
                        <summary>查看最小化前后摘要</summary>
                        <p className="ta-summary">
                          前：{item.before_json || '—'}
                          {'\n'}后：{item.after_json || '—'}
                        </p>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <Empty text="尚无管理员操作记录。" />
            )}
            <Pager {...pager} nextCursor={page.nextCursor} />
          </>
        )}
      </PageResult>
    </Panel>
  )
}
