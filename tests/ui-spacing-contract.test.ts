import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('UI spacing contract', () => {
  it('keeps labels separated from controls in vertical and horizontal fields', () => {
    const source = readFileSync('src/components/ui/field.tsx', 'utf8')

    expect(source).toContain("'flex flex-col gap-2'")
    expect(source).toContain('gap-x-4 gap-y-2')
    expect(source).toContain("'grid gap-4'")
    expect(source).toContain("'grid min-w-0 gap-2'")
  })

  it('reserves space around native select arrows', () => {
    const source = readFileSync('src/components/ui/select.tsx', 'utf8')

    expect(source).toContain('appearance-none')
    expect(source).toContain('pr-10')
    expect(source).toContain('right-3')
  })

  it('keeps text and icons separated inside shared buttons', () => {
    const source = readFileSync('src/components/ui/button.tsx', 'utf8')

    expect(source).toContain('gap-2')
    expect(source).toContain('px-4')
  })
})
