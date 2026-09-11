import { getTuneClueDb } from '@/lib/db.server'
import { parseBillingConfig } from '../billing/config'
import { DodoProvider } from '../billing/dodo'
import { authorizeAdmin } from './auth'
import { parseAdminConfig } from './config'
import { adminFailure, adminHeaders } from './http'
import { handleAdmin } from './router'
import { AdminError } from './types'

async function environment() {
  const { env } = await import('cloudflare:workers')
  return env as unknown as Record<string, unknown>
}
export async function serveAdmin(request: Request) {
  try {
    const env = await environment()
    if (!parseAdminConfig(env).enabled) throw new AdminError('admin_disabled', 404)
    const db = await getTuneClueDb()
    return handleAdmin(request, {
      env,
      db,
      billing: async () => {
        const config = parseBillingConfig({ ...env, DODO_CREDIT_PACKS_JSON: '[]' })
        return { db, config, provider: new DodoProvider(config) }
      },
    })
  } catch (error) {
    return adminFailure(error, crypto.randomUUID())
  }
}
export function isAdminPath(path: string) {
  return (
    path === '/admin' ||
    path.startsWith('/admin/') ||
    path === '/api/admin' ||
    path.startsWith('/api/admin/')
  )
}
export async function adminDocumentGuard(request: Request): Promise<Response | null> {
  // API handlers independently authorize each request. SSR contains no private
  // loaders, but document access is also denied here before rendering AdminShell.
  try {
    const env = await environment()
    const config = parseAdminConfig(env)
    if (!config.enabled) throw new AdminError('admin_disabled', 404)
    await authorizeAdmin(request, await getTuneClueDb(), config)
    return null
  } catch (error) {
    const status = error instanceof AdminError ? error.status : 503
    const login = status === 401
    // Only a static local return path is used. No request text or identity is reflected.
    const text = login
      ? '请重新使用 Google 登录后访问管理后台。'
      : status === 404
        ? '此页面暂不可用。'
        : status === 403
          ? '当前账户无管理权限。'
          : '后台暂不可用，请检查服务端配置。'
    const action = login
      ? '<a href="/api/auth/google?returnTo=%2Fadmin">使用 Google 登录</a>'
      : '<a href="/">返回网站</a>'
    return new Response(
      `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>TuneClue Admin</title></head><body><main><h1>TuneClue Admin</h1><p>${text}</p>${action}</main></body></html>`,
      {
        status,
        headers: {
          ...adminHeaders,
          'content-type': 'text/html; charset=utf-8',
          'x-frame-options': 'DENY',
          'content-security-policy':
            "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
        },
      },
    )
  }
}
