import { type AdminConfig, AdminError } from './types'

export function parseAdminConfig(env: Record<string, unknown>): AdminConfig {
  const text = (key: string) => (typeof env[key] === 'string' ? env[key].trim() : '')
  const enabled = text('ADMIN_ENABLED') === 'true'
  let origin: URL
  try {
    origin = new URL(text('ADMIN_SITE_ORIGIN') || 'https://tuneclue.com')
  } catch {
    throw new AdminError('admin_configuration_unavailable', 503)
  }
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    (origin.protocol !== 'https:' &&
      !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)))
  ) {
    throw new AdminError('admin_configuration_unavailable', 503)
  }
  const userIds = text('ADMIN_USER_IDS')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  if (userIds.length > 5 || userIds.some((v) => !/^[A-Za-z0-9_-]{1,128}$/.test(v)))
    throw new AdminError('admin_configuration_unavailable', 503)
  return {
    enabled,
    writeEnabled: text('ADMIN_WRITE_ENABLED') === 'true',
    userIds,
    origin: origin.origin,
    deployment: text('ADMIN_DEPLOYMENT_LABEL').slice(0, 60) || origin.host,
  }
}
export function parseEstimatedCost(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{1,3}(?:\.\d{1,6})?$/.test(value.trim())) return null
  const [whole, decimal = ''] = value.trim().split('.')
  const result = Number(whole) * 1_000_000 + Number(decimal.padEnd(6, '0'))
  return Number.isSafeInteger(result) ? result : null
}
