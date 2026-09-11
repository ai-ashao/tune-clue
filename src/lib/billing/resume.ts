import { createClientOnlyFn } from '@tanstack/react-start'

const DB_NAME = 'tuneclue-billing-resume'
const STORE = 'pending'
const KEY = 'recognition'
const TTL_MS = 30 * 60 * 1000

export type BillingResumeSource =
  | { kind: 'sample'; sample: File }
  | { kind: 'tiktok-url'; url: string }
type Stored = { userId: string; expiresAt: number; source: BillingResumeSource }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Your browser could not save this song search.'))
  })
}

export const saveBillingResume = createClientOnlyFn(
  async (source: BillingResumeSource, userId: string) => {
    if (!userId) throw new Error('Sign in before saving your song search.')
    if (source.kind === 'sample' && source.sample.size > 4 * 1024 * 1024)
      throw new Error('The prepared sample is too large.')
    const db = await openDb()
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite')
        transaction
          .objectStore(STORE)
          .put({ source, userId, expiresAt: Date.now() + TTL_MS } satisfies Stored, KEY)
        transaction.oncomplete = () => resolve()
        transaction.onabort = transaction.onerror = () =>
          reject(new Error('Your song search could not be saved.'))
      })
    } finally {
      db.close()
    }
  },
)

export const takeBillingResume = createClientOnlyFn(
  async (userId: string): Promise<BillingResumeSource | undefined> => {
    const db = await openDb()
    try {
      return await new Promise((resolve, reject) => {
        let result: BillingResumeSource | undefined
        const transaction = db.transaction(STORE, 'readwrite')
        const store = transaction.objectStore(STORE)
        const request = store.get(KEY)
        request.onsuccess = () => {
          const value = request.result as Stored | undefined
          if (value && value.expiresAt > Date.now() && value.userId === userId)
            result = value.source
          store.delete(KEY)
        }
        transaction.oncomplete = () => resolve(result)
        transaction.onabort = transaction.onerror = () =>
          reject(new Error('Your saved song search could not be restored.'))
      })
    } finally {
      db.close()
    }
  },
)
