export function isSandboxEnabled(input?: { development?: boolean; flag?: string }) {
  const development = input?.development ?? import.meta.env.DEV
  const flag = input?.flag ?? process.env.SHIPLEAN_SANDBOX
  return development || flag === 'true'
}

export const sandboxUiAvailable =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_SANDBOX === 'true'
