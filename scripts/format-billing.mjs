import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Uses the repository's pinned Biome. Does not install packages or format unrelated files.
const paths = JSON.parse(
  readFileSync(new URL('../docs/dodo-changed-files.json', import.meta.url), 'utf8'),
).filter((path) => /\.(?:ts|tsx|mjs|json|css)$/.test(path))
const result = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'biome', 'check', '--write', '--no-errors-on-unmatched', ...paths],
  { stdio: 'inherit' },
)
if (result.error) console.error(result.error.message)
process.exitCode = result.status ?? 1
