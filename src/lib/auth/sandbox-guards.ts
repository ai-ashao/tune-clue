import { notFound, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { isSandboxEnabled } from '../config/runtime'
import { productSurfaceEnabled } from '../product-config'
import { hasSandboxSession, sandboxUser } from './sandbox-session'

function disableCaching() {
  setResponseHeader('cache-control', 'no-store')
}

function requireAppSurface() {
  if (!productSurfaceEnabled('app')) throw notFound()
}

export const requireSandboxAvailable = createServerFn({ method: 'GET' }).handler(() => {
  disableCaching()
  requireAppSurface()
  if (!isSandboxEnabled()) throw notFound()
  return { available: true as const }
})

export const requireSandboxSession = createServerFn({ method: 'GET' }).handler(() => {
  disableCaching()
  requireAppSurface()
  if (!isSandboxEnabled()) throw notFound()
  if (!hasSandboxSession(getRequest())) throw redirect({ to: '/login' })
  return { authenticated: true as const, user: sandboxUser }
})
