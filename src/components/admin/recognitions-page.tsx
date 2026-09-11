import { useState } from 'react'
import type { Page, RecognitionView } from '@/lib/admin/types'
import { ActionConfirmDialog } from './action-confirm-dialog'
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
export function AdminRecognitionsPage() {
  const [initial] = useState(params)
  const [status, setStatus] = useState(initial.get('status') || '')
  const [source, setSource] = useState('')
  const [returned, setReturned] = useState('')
  const [issue, setIssue] = useState(initial.get('issue') || '')
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const filters = {
    status,
    source,
    returned,
    issue,
    q,
    userId: initial.get('userId') || undefined,
    from: from ? dates(from, to).from : initial.get('from') || undefined,
    to: to ? dates(from, to).to : initial.get('to') || undefined,
  }
  const pager = useCursor(JSON.stringify(filters))
  const state = useAdminData<Page<RecognitionView>>(
    `recognitions${queryString({ ...filters, cursor: pager.cursor })}`,
  )
  return (
    <>
      <PageTitle
        dataAsOf={state.dataAsOf}
        title="识别请求"
        description="只显示已记录的元数据；不保存原音视频或 TikTok URL，不播放用户媒体。"
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
          请求 / 用户 ID
          <input
            type="search"
            value={input}
            maxLength={160}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <label>
          结果
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部</option>
            <option value="accepted">已接受（不含拒绝）</option>
            {['running', 'matched', 'no_match', 'system_error', 'indeterminate', 'rejected'].map(
              (v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          来源
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">全部</option>
            <option value="local_file">本地文件</option>
            <option value="tiktok_url">TikTok 链接</option>
          </select>
        </label>
        <label>
          返还
          <select value={returned} onChange={(e) => setReturned(e.target.value)}>
            <option value="">全部</option>
            <option value="yes">已返还</option>
            <option value="no">未返还</option>
          </select>
        </label>
        <label>
          需处理
          <select value={issue} onChange={(e) => setIssue(e.target.value)}>
            <option value="">全部记录</option>
            <option value="active">异常可返还 / 超时待核实</option>
          </select>
        </label>
        <TimeFilter
          from={from}
          to={to}
          onChange={(key, value) => (key === 'from' ? setFrom(value) : setTo(value))}
        />
        <button type="submit">查询</button>
      </form>
      <PageResult state={state}>
        {(page) => (
          <>
            {page.items.length ? (
              <DataTable
                headers={[
                  '请求 / 用户',
                  '来源',
                  '结果',
                  '耗时',
                  '上游尝试',
                  '扣次 / 返还',
                  '时间（UTC）',
                ]}
              >
                {page.items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <ResourceLink kind="recognitions" id={r.id} />
                      <br />
                      <ResourceLink kind="users" id={r.user_id} />
                    </td>
                    <td>
                      <Badge value={r.source_kind} />
                    </td>
                    <td>
                      <Badge value={r.effective_status} />
                    </td>
                    <td>{r.duration_ms === null ? '—' : `${r.duration_ms} ms`}</td>
                    <td>{r.provider_call_count}</td>
                    <td>
                      {r.charged} / {r.returned}
                    </td>
                    <td>{utc(r.created_at)}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <Empty text="没有符合条件的已记录请求。旧账本不等于完整识别历史。" />
            )}
            <Pager {...pager} nextCursor={page.nextCursor} />
          </>
        )}
      </PageResult>
    </>
  )
}
const eligibilityLabels: Record<string, string> = {
  already_returned: '该请求已返还',
  no_valid_debit: '没有有效原始扣次',
  completed_normally: '正常匹配或未匹配不可返还',
  still_running: '仍在执行期限内',
  too_early: '未知结果尚未达到 15 分钟核实门槛',
  not_eligible_yet: '尚不符合返还条件',
  system_failure: '技术失败可补回',
  unresolved_timeout: '超时结果不明，需核实',
}
export function AdminRecognitionDetail({ attemptId }: { attemptId: string }) {
  const state = useAdminData<RecognitionView>(`recognitions/${attemptId}`)
  const r = state.data
  const [revision, setRevision] = useState(0)
  function complete() {
    state.refresh()
    setRevision((v) => v + 1)
  }
  return (
    <>
      <a href="/admin/recognitions">← 识别请求</a>
      <PageTitle
        dataAsOf={state.dataAsOf}
        title="识别详情"
        description="阶段来自服务端持久化记录。正常未匹配与技术失败采用不同扣次规则。"
        onRefresh={complete}
      />
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorBox error={state.error} />
      ) : r ? (
        <>
          <Panel title="请求与执行">
            <Facts
              items={[
                ['请求编号', <code key="id">{r.id}</code>],
                ['所属用户', <ResourceLink key="user" kind="users" id={r.user_id} />],
                ['来源', <Badge key="src" value={r.source_kind} />],
                ['当前判定', <Badge key="status" value={r.effective_status} />],
                ['最后保存的状态', r.status],
                ['最后执行阶段', <Badge key="stage" value={r.stage} />],
                ['标准错误码', r.error_code || '—'],
                ['服务端耗时', r.duration_ms === null ? '—' : `${r.duration_ms} ms`],
                ['创建时间', utc(r.created_at)],
                ['全流程硬截止', utc(r.execution_deadline_at)],
                ['结束时间', utc(r.finished_at)],
              ]}
            />
          </Panel>
          <Panel title="次数与上游调用">
            <Facts
              items={[
                ['实际扣次', r.charged],
                ['已返还', r.returned],
                ['返还方式', <Badge key="resolution" value={r.resolution} />],
                ['AudD 发送边界尝试次数', r.provider_call_count],
                [
                  '估算成本（不是账单）',
                  r.estimated_unit_cost_microusd === null
                    ? '未配置估算单价'
                    : `$${((r.provider_call_count * r.estimated_unit_cost_microusd) / 1_000_000).toFixed(6)}`,
                ],
              ]}
            />
            <p className="ta-muted">
              上游发送与数据库不是同一事务，发送边界中断时实际调用或计费可能不确定。内部 PoC
              不包含在此统计中。
            </p>
          </Panel>
          {r.effective_status === 'indeterminate' ? (
            <p className="ta-notice">
              结果不明不代表确定失败。超出硬截止且自创建满 15 分钟后，才可在人工核实后补偿。
            </p>
          ) : null}
          <div className="ta-actions">
            <ActionConfirmDialog
              action="return_recognition_credit"
              targetId={attemptId}
              summary={`请求 ${r.id}\n用户 ${r.user_id}\n${r.effective_status} · 原扣次 ${r.charged}，已返还 ${r.returned}`}
              disabled={!r.eligibility?.allowed}
              disabledReason={
                eligibilityLabels[r.eligibility?.reason || ''] || r.eligibility?.reason
              }
              needsConfirmation={r.eligibility?.needsConfirmation}
              onComplete={complete}
            />
          </div>
          <AuditTimeline
            key={revision}
            targetType="recognition"
            targetId={attemptId}
            revision={revision}
          />
        </>
      ) : null}
    </>
  )
}
