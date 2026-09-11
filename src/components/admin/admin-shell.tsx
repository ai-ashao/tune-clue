import { Outlet, useRouterState } from '@tanstack/react-router'
import { createContext, type ReactNode, useContext, useEffect } from 'react'
import type { AdminSession } from './client'
import { Badge, ErrorBox, Loading, useAdminData } from './shared'
import './admin.css'
const SessionContext = createContext<AdminSession | null>(null)
export function useAdminSession() {
  return useContext(SessionContext)
}
export function AdminShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const session = useAdminData<AdminSession>('session')
  useEffect(() => {
    function recheck() {
      if (document.visibilityState === 'visible') session.refresh()
    }
    function leaving() {
      document.documentElement.dataset.adminHidden = 'true'
    }
    function restored(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload()
    }
    document.addEventListener('visibilitychange', recheck)
    window.addEventListener('pageshow', restored)
    window.addEventListener('pagehide', leaving)
    const timer = session.data
      ? window.setTimeout(
          session.refresh,
          Math.max(0, session.data.sessionExpiresAt - Date.now()) + 100,
        )
      : undefined
    return () => {
      document.removeEventListener('visibilitychange', recheck)
      window.removeEventListener('pageshow', restored)
      window.removeEventListener('pagehide', leaving)
      window.clearTimeout(timer)
    }
  }, [session.refresh, session.data])
  let content: ReactNode
  if (session.loading) content = <Loading />
  else if (session.error) content = <ErrorBox error={session.error} />
  else if (!session.data) content = <p>后台未就绪。</p>
  else
    content = (
      <SessionContext.Provider value={session.data}>
        <aside className="ta-sidebar">
          <a className="ta-brand" href="/admin">
            TuneClue <span>ADMIN</span>
          </a>
          <nav aria-label="管理模块">
            {[
              ['/admin', '概览'],
              ['/admin/users', '用户与次数'],
              ['/admin/orders', '订单与支付异常'],
              ['/admin/recognitions', '识别请求'],
            ].map(([href, title]) => (
              <a
                key={href}
                href={href}
                aria-current={
                  (href === '/admin' ? pathname === href : pathname.startsWith(href))
                    ? 'page'
                    : undefined
                }
              >
                {title}
              </a>
            ))}
          </nav>
          <a className="ta-back" href="/">
            返回网站 ↗
          </a>
        </aside>
        <div className="ta-main">
          <header className="ta-top">
            <div>
              <strong>{session.data.deployment}</strong>{' '}
              <Badge value={session.data.provider.environment} />
              <span className="ta-badge">
                {session.data.readOnly ? '只读模式' : '处理操作已启用'}
              </span>
            </div>
            <span className="ta-admin-name">
              {session.data.admin.name || session.data.admin.email}
            </span>
          </header>
          {!session.data.provider.ready ? (
            <p className="ta-notice">Dodo 尚未配置。已有记录可查看，订单核对暂不可用。</p>
          ) : null}
          <Outlet />
          <footer className="ta-foot">
            仅供内部排查 · 时间均为 UTC · 数据按需查询，不代表上游实时账单
          </footer>
        </div>
      </SessionContext.Provider>
    )
  return (
    <div className="ta-app" lang="zh-CN">
      {content}
    </div>
  )
}
