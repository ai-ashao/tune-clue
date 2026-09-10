function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback
  return value.trim().toLowerCase() === 'true'
}

export const tuneClueFlags = {
  // TikTok recognition is a shipped feature. Keep the environment variable as
  // an explicit emergency kill switch rather than requiring it for every build.
  tiktok: readBoolean(import.meta.env.VITE_ENABLE_TIKTOK, true),
} as const
