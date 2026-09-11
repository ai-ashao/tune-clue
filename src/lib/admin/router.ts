import { parseBillingConfig, providerReady } from '../billing/config'
import type { BillingContext } from '../billing/service'
import type { BillingDb } from '../billing/types'
import { adminReconcile, adminReturnCredit } from './actions'
import { authorizeAdmin } from './auth'
import { parseAdminConfig } from './config'
import { adminFailure, adminJson, exactObject, id, readAdminJson, requireAdminOrigin } from './http'
import { findOperation, operationResult } from './operations'
import {
  listAudit,
  listEvents,
  listOrders,
  listRecognitions,
  orderDetail,
  orderRelated,
  overview,
  parseFilter,
  queryObject,
  recognitionDetail,
  requireAdminSchema,
  searchUsers,
  userCredits,
  userDetail,
} from './queries'
import { type AdminContext, AdminError } from './types'

export type AdminServices = {
  env: Record<string, unknown>
  db: BillingDb
  billing: () => Promise<BillingContext>
}
export function providerStatus(env: Record<string, unknown>) {
  // New pack configuration is irrelevant to reading and reconciling old orders.
  try {
    const config = parseBillingConfig({ ...env, DODO_CREDIT_PACKS_JSON: '[]' })
    return {
      environment: config.environment,
      ready: providerReady(config),
      newSalesEnabled: config.enabled,
    }
  } catch {
    return { environment: 'unconfigured', ready: false, newSalesEnabled: false }
  }
}
export async function handleAdmin(request: Request, services: AdminServices): Promise<Response> {
  const traceId = crypto.randomUUID()
  try {
    const config = parseAdminConfig(services.env)
    const admin = await authorizeAdmin(request, services.db, config)
    if (request.method === 'POST') requireAdminOrigin(request, config.origin)
    const context: AdminContext = { db: services.db, admin, config, traceId }
    const path = new URL(request.url).pathname
    const prefix = '/api/admin/'
    if (!path.startsWith(prefix)) throw new AdminError('resource_not_found', 404)
    const route = path.slice(prefix.length)
    const query = queryObject(new URL(request.url).searchParams)
    let data: unknown
    if (route === 'session' && request.method === 'GET') {
      data = {
        admin: { id: admin.id, email: admin.email, name: admin.name },
        readOnly: !config.writeEnabled,
        deployment: config.deployment,
        provider: providerStatus(services.env),
        sessionExpiresAt: admin.sessionCreatedAt + 8 * 3_600_000,
      }
    } else {
      await requireAdminSchema(services.db)
      const db = services.db
      if (route === 'overview' && request.method === 'GET') {
        exactObject(query, ['range'])
        data = await overview(db, query.range || '7d')
      } else if (route === 'users/search' && request.method === 'POST')
        data = await searchUsers(db, await readAdminJson(request))
      else if (route === 'orders' && request.method === 'GET')
        data = await listOrders(db, parseFilter(query))
      else if (route === 'payment-events' && request.method === 'GET')
        data = await listEvents(db, parseFilter(query))
      else if (route === 'recognitions' && request.method === 'GET')
        data = await listRecognitions(db, parseFilter(query))
      else if (route === 'audit' && request.method === 'GET') {
        const { targetType, targetId, ...filters } = query
        data = await listAudit(db, targetType, id(targetId), parseFilter(filters))
      } else {
        const parts = route.split('/')
        const [resource, rawId, action] = parts
        const targetId = id(rawId)
        if (parts.length > 3) throw new AdminError('resource_not_found', 404)
        if (request.method === 'GET' && parts.length === 2) {
          exactObject(query, [])
          if (resource === 'users') data = await userDetail(db, targetId)
          else if (resource === 'orders') data = await orderDetail(db, targetId)
          else if (resource === 'recognitions') data = await recognitionDetail(db, targetId)
          else if (resource === 'operations') {
            const op = await findOperation(db, targetId)
            if (!op || op.admin_user_id !== admin.id)
              throw new AdminError('resource_not_found', 404)
            data = operationResult(op)
          } else throw new AdminError('resource_not_found', 404)
        } else if (request.method === 'GET' && resource === 'users' && action === 'credits') {
          const { ledger = 'spendable', ...filters } = query
          await userDetail(db, targetId)
          data = await userCredits(db, targetId, ledger, parseFilter(filters))
        } else if (
          request.method === 'GET' &&
          resource === 'orders' &&
          (action === 'refunds' || action === 'disputes')
        ) {
          await orderDetail(db, targetId)
          data = await orderRelated(db, targetId, action, parseFilter(query))
        } else if (request.method === 'POST' && resource === 'orders' && action === 'reconcile') {
          exactObject(query, [])
          data = await adminReconcile(
            context,
            targetId,
            await readAdminJson(request),
            services.billing,
          )
        } else if (
          request.method === 'POST' &&
          resource === 'recognitions' &&
          action === 'return-credit'
        ) {
          exactObject(query, [])
          data = await adminReturnCredit(context, targetId, await readAdminJson(request))
        } else throw new AdminError('resource_not_found', 404)
      }
    }
    return adminJson(data, traceId)
  } catch (error) {
    if (!(error instanceof AdminError)) console.error('admin-request-failed', { traceId })
    return adminFailure(error, traceId)
  }
}
