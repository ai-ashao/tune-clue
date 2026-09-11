import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const paths = JSON.parse(readFileSync('docs/admin-changed-files.json', 'utf8')).filter(
  (path) => /\.(?:ts|tsx|mjs|json|css)$/.test(path) && existsSync(path),
)
const result = spawnSync('pnpm', ['exec', 'biome', 'check', '--write', ...paths], {
  stdio: 'inherit',
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
