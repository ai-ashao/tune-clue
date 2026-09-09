import type { SharePlatform } from '@/lib/credits/share-tasks'

export type AuthUser = {
  id: string
  email: string
  name?: string
}

export type AuthSessionResponse =
  | { available: false; authenticated: false }
  | { available: true; authenticated: false }
  | {
      available: true
      authenticated: true
      user: AuthUser
      credits: number
      shareRewards: SharePlatform[]
    }
