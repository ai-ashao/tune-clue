import { useEffect, useId, useRef, useState } from 'react'
import type { AdminAction, OperationResult } from '@/lib/admin/types'
import { useAdminSession } from './admin-shell'
import { AdminApiError, adminRequest, benignOutcomes, operationDescription } from './client'
import { ErrorBox } from './shared'

export function ActionConfirmDialog({
  action,
  targetId,
  summary,
  disabled,
  disabledReason,
  needsConfirmation = false,
  onComplete,
}: {
  action: AdminAction
  targetId: string
  summary: string
  disabled?: boolean
  disabledReason?: string
  needsConfirmation?: boolean
  onComplete: () => void
}) {
  const session = useAdminSession()
  const ref = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const [reasonText, setReasonText] = useState('')
  const [reasonCode, setReasonCode] = useState(
    action === 'reconcile_order'
      ? 'user_reports_missing_credits'
      : needsConfirmation
        ? 'unresolved_timeout'
        : 'system_failure',
  )
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const [result, setResult] = useState<OperationResult>()
  const requestRef = useRef<
    | { requestId: string; reasonCode: string; reasonText: string; confirmedUnresolved?: boolean }
    | undefined
  >(undefined)
  const [pending, setPending] = useState(false)
  const polls = useRef(0)
  const title = action === 'reconcile_order' ? '重新核对订单' : '补回异常扣次'
  const endpoint =
    action === 'reconcile_order'
      ? `orders/${targetId}/reconcile`
      : `recognitions/${targetId}/return-credit`
  const readOnly = !session || session.readOnly
  const unavailable = action === 'reconcile_order' && !session?.provider.ready
  const blocked = readOnly || unavailable || disabled
  function close() {
    if (busy) return
    ref.current?.close()
    trigger.current?.focus()
  }
  useEffect(() => {
    // Only poll the local operation record. Never initiate a new write on mount.
    if (!result || result.state !== 'running' || !ref.current?.open) return
    if (polls.current >= 30) {
      setError(new AdminApiError('operation_still_running', 202))
      return
    }
    polls.current += 1
    let cancelled = false
    const timer = window.setTimeout(() => {
      adminRequest<OperationResult>(`operations/${result.operationId}`)
        .then((next) => {
          if (cancelled) return
          setResult(next)
          if (next.state !== 'running') setPending(false)
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e)
        })
    }, 2000)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [result])
  async function submit() {
    if (busy) return
    const payload = requestRef.current ?? {
      requestId: crypto.randomUUID(),
      reasonCode,
      reasonText: reasonText.trim(),
      ...(needsConfirmation ? { confirmedUnresolved: confirmed } : {}),
    }
    requestRef.current = payload
    polls.current = 0
    setPending(true)
    setBusy(true)
    setError(undefined)
    try {
      const response = await adminRequest<OperationResult>(endpoint, payload)
      setResult(response)
      if (response.state !== 'running') setPending(false)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="ta-primary"
        disabled={blocked}
        onClick={() => {
          if (!pending) {
            setError(undefined)
            setResult(undefined)
            requestRef.current = undefined
            setReasonText('')
            setConfirmed(false)
          }
          ref.current?.showModal()
        }}
      >
        {title}
      </button>
      {blocked ? (
        <small className="ta-muted">
          {readOnly
            ? '只读模式'
            : unavailable
              ? '支付服务尚未配置'
              : disabledReason || '当前不符合处理条件'}
        </small>
      ) : null}
      <dialog
        ref={ref}
        className="ta-dialog"
        aria-labelledby={titleId}
        onCancel={(event) => {
          if (busy) event.preventDefault()
        }}
        onClose={() => {
          trigger.current?.focus()
          if (result && result.state !== 'running') onComplete()
        }}
      >
        <h2 id={titleId}>{title}</h2>
        <p className="ta-summary">{summary}</p>
        <p className="ta-notice">
          {action === 'reconcile_order'
            ? '仅查询 Dodo 权威记录并校验；不会创建新付款，不会强制标记已支付。'
            : '仅返还本请求实际扣除且尚未返还的次数，最多 1 次。不是现金退款，也不会把负余额归零。'}
        </p>
        {result ? (
          <output className={benignOutcomes.has(result.outcome) ? 'ta-panel' : 'ta-alert'}>
            <p>{operationDescription(result)}</p>
            <small>
              操作编号：<code>{result.operationId}</code>
            </small>
            {typeof result.currentBalance === 'number' ? (
              <p>处理后可消费余额：{result.currentBalance}</p>
            ) : null}
          </output>
        ) : null}
        {error ? <ErrorBox error={error} /> : null}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <label>
            处理原因
            <select
              value={reasonCode}
              disabled={pending || busy}
              onChange={(e) => setReasonCode(e.target.value)}
            >
              {action === 'reconcile_order' ? (
                <>
                  <option value="user_reports_missing_credits">用户反馈次数未到账</option>
                  <option value="payment_event_pending">支付通知未完成</option>
                  <option value="verification_after_fix">修复后重新验证</option>
                </>
              ) : (
                <option value={needsConfirmation ? 'unresolved_timeout' : 'system_failure'}>
                  {needsConfirmation ? '超时结果不明，人工核实后补偿' : '已确认技术失败'}
                </option>
              )}
            </select>
          </label>
          <label>
            {needsConfirmation ? '核实证据和补偿说明' : '说明（5–500 字）'}
            <textarea
              required
              minLength={5}
              maxLength={500}
              value={reasonText}
              disabled={pending || busy}
              onChange={(e) => setReasonText(e.target.value)}
            />
          </label>
          {needsConfirmation ? (
            <label className="ta-check">
              <input
                type="checkbox"
                checked={confirmed}
                required
                disabled={pending || busy}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              已核对日志或用户反馈，无法确认用户获得有效结果；按服务补偿返还本次扣次。结果仍保留为不明。
            </label>
          ) : null}
          <div className="ta-dialog-actions">
            <button type="button" disabled={busy} onClick={close}>
              {result?.state !== 'running' && result ? '关闭' : '取消'}
            </button>
            {!result || result.state === 'running' ? (
              <button
                className="ta-primary"
                type="submit"
                disabled={busy || reasonText.trim().length < 5 || (needsConfirmation && !confirmed)}
              >
                {busy ? '正在处理…' : pending ? '使用原请求编号重试' : '确认执行'}
              </button>
            ) : null}
          </div>
        </form>
      </dialog>
    </>
  )
}
