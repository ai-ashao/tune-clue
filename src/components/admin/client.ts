import type { OperationResult } from '@/lib/admin/types'

export type AdminSession = {
  admin: { id: string; email: string; name: string | null }
  readOnly: boolean
  deployment: string
  provider: { environment: string; ready: boolean; newSalesEnabled: boolean }
  sessionExpiresAt: number
}
export class AdminApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly traceId?: string,
    readonly retryAfter?: number,
  ) {
    super(code)
    this.name = 'AdminApiError'
  }
}
export async function adminRequest<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  onMetadata?: (time: number) => void,
): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    headers: {
      accept: 'application/json',
      ...(body === undefined
        ? {}
        : {
            'content-type': 'application/json',
            'X-TuneClue-Admin-Action': '1',
          }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const payload: unknown = await response.json().catch(() => null)
  const result =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null
  if (!response.ok || result?.ok !== true) {
    throw new AdminApiError(
      typeof result?.code === 'string' ? result.code : 'request_failed',
      response.status,
      typeof result?.traceId === 'string' ? result.traceId : undefined,
      Number(response.headers.get('retry-after')) || undefined,
    )
  }
  if (typeof result.dataAsOf === 'number' && Number.isSafeInteger(result.dataAsOf)) {
    onMetadata?.(result.dataAsOf)
  }
  return result.data as T
}
export function queryString(input: Record<string, string | number | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(input))
    if (value !== undefined && value !== '') query.set(key, String(value))
  const encoded = query.toString()
  return encoded ? `?${encoded}` : ''
}
export function describeError(error: unknown): string {
  if (!(error instanceof AdminApiError))
    return '网络异常，未能确认结果。请重试查询；不要重复创建新操作。'
  const messages: Record<string, string> = {
    auth_required: '请先登录。',
    admin_session_expired: '后台会话已超过 8 小时，请重新登录。',
    admin_forbidden: '当前账户没有后台权限。',
    admin_disabled: '后台尚未启用。',
    admin_read_only: '当前为只读模式，未执行操作。',
    invalid_origin: '来源校验失败，请从本站后台重新打开。',
    admin_schema_unavailable: '后台数据结构尚未就绪，请先检查本地迁移与部署配置。',
    provider_unavailable: '支付服务未配置或查询失败；没有据此强制发放次数。',
    environment_unavailable: '订单与当前支付环境不同，只能查看。',
    resource_not_found: '未找到该记录。',
    operation_still_running:
      '本地操作仍未结束，已暂停自动查询。可保留原请求编号重试，不要重新创建付款。',
    request_conflict: '此请求编号已经用于另一项操作，请重新核查目标。',
    rate_limited: '操作过于频繁，请稍后再试。',
    not_eligible: '当前记录不符合补回条件，请刷新详情。',
    invalid_request: '请求内容不符合要求。',
    invalid_email: '请输入完整邮箱。',
  }
  return `${messages[error.code] || `请求失败：${error.code}`} ${error.retryAfter ? `请等待 ${error.retryAfter} 秒。` : ''}`.trim()
}
export const outcomeText: Record<string, string> = {
  running: '操作处理中，可以查询处理结果。',
  updated: '已核对并同步订单权益。',
  unchanged: '已核对，记录一致，没有新增次数。',
  throttled: '刚刚核对过，请稍后重试。',
  payment_not_ready: '尚无可确认付款，没有新增次数。',
  review_required: '存在数据矛盾，保留待核查，未强制发放。',
  environment_unavailable: '环境不一致，未查询其他环境的订单。',
  provider_unavailable: '提供商不可用，未完成核对。',
  provider_or_commit_unavailable: '上游查询或本地提交失败，请核查操作记录。',
  returned: '已补回该请求实际扣除的次数。',
  already_returned: '该请求已经返还，没有重复加次。',
  not_eligible: '该请求目前不符合补回条件，未加次。',
  checkout_missing: '缺少收银台会话，请到 Dodo 核查，不要让用户盲目重付。',
}
export const benignOutcomes = new Set(['updated', 'unchanged', 'returned', 'already_returned'])
export function operationDescription(result: OperationResult) {
  return outcomeText[result.outcome] || `处理结果：${result.outcome}`
}
