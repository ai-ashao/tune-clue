export type RateLimitDecision = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export interface RateLimitAdapter {
  check(key: string, now?: number): RateLimitDecision
}

export class FixedWindowRateLimiter implements RateLimitAdapter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now = Date.now()): RateLimitDecision {
    const current = this.buckets.get(key)
    const bucket =
      !current || current.resetAt <= now ? { count: 0, resetAt: now + this.windowMs } : current
    bucket.count += 1
    this.buckets.set(key, bucket)

    return {
      allowed: bucket.count <= this.limit,
      remaining: Math.max(0, this.limit - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }
}

export function requestIdentity(request: Request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'local'
  )
}
