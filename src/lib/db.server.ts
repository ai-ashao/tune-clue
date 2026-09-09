export class DatabaseConfigurationError extends Error {
  constructor(message = 'TUNECLUE_DB is not configured.') {
    super(message)
    this.name = 'DatabaseConfigurationError'
  }
}

export async function getTuneClueDb(): Promise<D1Database> {
  const { env } = await import('cloudflare:workers')
  const db = (env as unknown as { TUNECLUE_DB?: D1Database }).TUNECLUE_DB
  if (!db) throw new DatabaseConfigurationError()
  return db
}
