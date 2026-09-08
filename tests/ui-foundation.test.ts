import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('UI foundation', () => {
  it('keeps the shadcn component contract local and framework-neutral', () => {
    const config = JSON.parse(readFileSync('components.json', 'utf8')) as {
      rsc: boolean
      aliases: { ui: string }
      tailwind: { css: string }
    }
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
    }

    expect(config.rsc).toBe(false)
    expect(config.aliases.ui).toBe('@/components/ui')
    expect(config.tailwind.css).toBe('src/styles.css')
    expect(packageJson.dependencies['class-variance-authority']).toBeTruthy()
    expect(packageJson.devDependencies['@tailwindcss/vite']).toBeTruthy()
  })
})
