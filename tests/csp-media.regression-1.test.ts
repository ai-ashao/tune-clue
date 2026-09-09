import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('local media CSP regression', () => {
  // Regression: ISSUE-001 — the identify workbench could not load a local video blob
  // Found by /qa on 2026-09-09
  // Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-09-09.md
  it('allows browser-local blob media without widening other resource policies', () => {
    const startSource = readFileSync('src/start.ts', 'utf8')

    expect(startSource).toContain('"media-src \'self\' blob:"')
    expect(startSource).toContain('"default-src \'self\'"')
    expect(startSource).toContain('"frame-ancestors \'none\'"')
  })
})
