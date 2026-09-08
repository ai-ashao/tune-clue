export type ModuleManifest = {
  id: 'auth' | 'email' | 'storage'
  version: string
  optional: boolean
  env: string[]
  tables: string[]
  routes: string[]
  securityBoundary: string
  dependsOn: string[]
  disable: string
  acceptance: string[]
}

export const moduleManifests: ModuleManifest[] = [
  {
    id: 'auth',
    version: '0.1.0',
    optional: false,
    env: [],
    tables: [],
    routes: ['/login', '/dashboard', '/api/sandbox/session'],
    securityBoundary:
      'The local demo uses an explicit HttpOnly session and never implies production auth.',
    dependsOn: [],
    disable: 'Keep public routes and replace the demo session before removing protected routes.',
    acceptance: ['anonymous session request is rejected', 'local login sets an HttpOnly cookie'],
  },
  {
    id: 'email',
    version: '0.1.0',
    optional: true,
    env: ['RESEND_API_KEY'],
    tables: [],
    routes: [],
    securityBoundary: 'Provider keys remain server-only and messages cross an adapter contract.',
    dependsOn: [],
    disable: 'Use disabledEmailAdapter.',
    acceptance: ['disabled adapter fails explicitly'],
  },
  {
    id: 'storage',
    version: '0.1.0',
    optional: true,
    env: ['R2_BUCKET'],
    tables: [],
    routes: [],
    securityBoundary: 'Object keys are provider-neutral and credentials remain server-only.',
    dependsOn: [],
    disable: 'Use disabledStorageAdapter.',
    acceptance: ['disabled reads return null'],
  },
]
