function readBoolean(value: string | undefined) {
  return value?.trim().toLowerCase() === 'true'
}

export const tuneClueFlags = {
  tiktok: readBoolean(import.meta.env.VITE_ENABLE_TIKTOK),
} as const
