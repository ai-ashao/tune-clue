export interface ObjectStorageAdapter {
  readonly id: 'disabled' | 'r2' | 's3'
  put(key: string, body: Uint8Array, contentType: string): Promise<{ key: string }>
  get(key: string): Promise<Uint8Array | null>
}

export const disabledStorageAdapter: ObjectStorageAdapter = {
  id: 'disabled',
  put: async () => {
    throw new Error('Object storage is disabled. Configure an R2 or S3 adapter first.')
  },
  get: async () => null,
}
