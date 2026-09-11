import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))
let ts
try {
  ts = require(process.env.TUNECLUE_TYPESCRIPT_PATH || 'typescript')
} catch {
  console.error('Install project dependencies first: pnpm install --frozen-lockfile')
  process.exit(1)
}
const source = join(root, 'src/lib/billing')
const names = [
  'types',
  'config',
  'http',
  'signature',
  'dodo',
  'store',
  'payment',
  'fulfillment',
  'service',
]
const options = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  noEmit: true,
  skipLibCheck: false,
  types: [],
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
}
const program = ts.createProgram(
  names.map((name) => join(source, `${name}.ts`)),
  options,
)
const diagnostics = ts.getPreEmitDiagnostics(program)
if (diagnostics.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (name) => name,
      getNewLine: () => '\n',
    }),
  )
  process.exit(1)
}
console.log(`Billing core strict TypeScript: ${names.length} modules passed`)
const temporary = mkdtempSync(join(tmpdir(), 'tuneclue-billing-'))
try {
  for (const name of names) {
    const result = ts.transpileModule(readFileSync(join(source, `${name}.ts`), 'utf8'), {
      compilerOptions: options,
    })
    writeFileSync(
      join(temporary, `${name}.mjs`),
      result.outputText.replace(/(from\s+['"]\.\/[^'"]+)(['"])/g, '$1.mjs$2'),
    )
  }
  const tests = readdirSync(join(root, 'tests/billing'))
    .filter((name) => name.endsWith('.node.mjs'))
    .map((name) => join(root, 'tests/billing', name))
  if (!tests.length) throw new Error('No billing tests were found.')
  const result = spawnSync(process.execPath, ['--test', ...tests], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, TUNECLUE_BILLING_BUILD: temporary },
  })
  process.exitCode = result.status ?? 1
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
