import { createClientOnlyFn } from '@tanstack/react-start'

const DATABASE_NAME = 'tuneclue-client'
const STORE_NAME = 'recognition-resume'
const KEY = 'pending-sample'
const TTL_MS = 10 * 60 * 1000

type StoredSample = {
  sample: File
  expiresAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB could not open.'))
  })
}

export const saveResumeSample = createClientOnlyFn(async (sample: File) => {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction
        .objectStore(STORE_NAME)
        .put({ sample, expiresAt: Date.now() + TTL_MS } satisfies StoredSample, KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () =>
        reject(transaction.error || new Error('Could not store the recognition sample.'))
    })
  } finally {
    db.close()
  }
})

export const takeResumeSample = createClientOnlyFn(async (): Promise<File | undefined> => {
  const db = await openDb()
  try {
    return await new Promise<File | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(KEY)
      request.onsuccess = () => {
        const stored = request.result as StoredSample | undefined
        store.delete(KEY)
        resolve(stored && stored.expiresAt > Date.now() ? stored.sample : undefined)
      }
      request.onerror = () =>
        reject(request.error || new Error('Could not restore the recognition sample.'))
    })
  } finally {
    db.close()
  }
})
