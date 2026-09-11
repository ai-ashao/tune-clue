import { useId, useState } from 'react'
import type { Overview } from '@/lib/admin/types'
import { queryString } from './client'
import { Empty, ErrorBox, Facts, Loading, PageTitle, Panel, useAdminData, utc } from './shared'
export function AdminOverviewPage() {
  const issuesId = useId()
  const [range, setRange] = useState('7d')
  const state = useAdminData<Overview>(`overview?range=${range}`)
  const data = state.data
  return (
    <>
      <PageTitle
        dataAsOf={state.dataAsOf}
        title="运营概览"
        description="当前部署业务记录。金额不等于净收入，识别统计不等于上游账单。"
        onRefresh={state.refresh}
      />
      <div className="ta-filters">
        <label>
          统计范围（UTC）
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">今日</option>
            <option value="7d">近 7 个自然日</option>
            <option value="30d">近 30 个自然日</option>
          </select>
        </label>
      </div>
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorBox error={state.error} />
      ) : data ? (
        <>
          <div className="ta-cards">
            <a
              className="ta-card"
              href={`/admin/users${queryString({ from: data.from, to: data.to })}`}
            >
              新增用户<strong>{data.newUsers}</strong>
              <small>本 D1 的账户，不按支付环境切分</small>
            </a>
            <a
              className="ta-card"
              href={`/admin/orders${queryString({ environment: 'live_mode', confirmed: 'yes', from: data.from, to: data.to })}`}
            >
              已确认正式付款<strong>{data.confirmedLiveOrders}</strong>
              <small>本地首次确认，退款订单仍计入</small>
            </a>
            <a
              className="ta-card"
              href={`/admin/recognitions${queryString({ status: 'accepted', from: data.from, to: data.to })}`}
            >
              用户识别请求<strong>{data.recognitions ?? '—'}</strong>
              <small>
                {data.recognitions === null ? '尚未开始记录' : '已去重，不含 rejected 请求'}
              </small>
            </a>
            <a className="ta-card" href={`#${issuesId}`}>
              当前待处理异常<strong>{data.openIssues}</strong>
              <small>跨分类去重，不受日期范围截断</small>
            </a>
          </div>
          <Panel title="当前异常分类">
            <div id={issuesId} className="ta-facts">
              <a href="/admin/orders?environment=all&issue=active">
                订单待核查：{data.groups.orders}
              </a>
              <a href="/admin/orders?view=events&environment=all&issue=active">
                通知未完成或未关联：{data.groups.events}
              </a>
              <a href="/admin/orders?environment=all&issue=entitlement">
                订单权益不一致：{data.groups.entitlements}
              </a>
              <a href="/admin/recognitions?issue=active">
                识别待返还或待核实：{data.groups.recognitions}
              </a>
            </div>
            <p className="ta-muted">分类数量可能重叠，不能直接相加为受影响订单数。</p>
          </Panel>
          <Panel title="识别质量">
            {data.quality ? (
              <Facts
                items={[
                  ['匹配成功', data.quality.matched],
                  ['正常未匹配', data.quality.no_match],
                  ['技术失败', data.quality.system_error],
                  ['结果不明', data.quality.indeterminate],
                  ['仍在处理', data.quality.running],
                  [
                    '正常完成样本匹配率',
                    data.quality.matched + data.quality.no_match
                      ? `${((100 * data.quality.matched) / (data.quality.matched + data.quality.no_match)).toFixed(1)}%`
                      : '—',
                  ],
                  [
                    '平均已记录耗时',
                    data.quality.average_ms === null
                      ? '—'
                      : `${Math.round(data.quality.average_ms)} ms`,
                  ],
                ]}
              />
            ) : (
              <Empty text="尚未记录识别请求；无法据此推断历史识别成功率。" />
            )}
          </Panel>
          <p className="ta-muted">
            区间：{utc(data.from)} 至 {utc(data.to)}（不含结束时刻）。内部 PoC 请求不纳入。
          </p>
        </>
      ) : null}
    </>
  )
}
