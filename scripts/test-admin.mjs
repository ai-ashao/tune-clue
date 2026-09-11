import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))
let ts
try {
  ts = require(process.env.TUNECLUE_TYPESCRIPT_PATH || 'typescript')
} catch {
  console.error('Run pnpm install --frozen-lockfile first.')
  process.exit(1)
}
const entries = ['admin/router', 'recognition/request-handler', 'recognition/audd.server'].map(
  (name) => join(root, 'src/lib', `${name}.ts`),
)
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
const program = ts.createProgram(entries, options)
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
const files = program
  .getSourceFiles()
  .filter((file) => !file.isDeclarationFile && file.fileName.startsWith(join(root, 'src')))
console.log(
  `Admin/recognition core strict TypeScript ${ts.version}: ${files.length} modules passed`,
)
const temporary = mkdtempSync(join(tmpdir(), 'tuneclue-admin-'))
try {
  for (const file of files) {
    const output = join(
      temporary,
      relative(join(root, 'src/lib'), file.fileName).replace(/\.ts$/, '.mjs'),
    )
    mkdirSync(dirname(output), { recursive: true })
    const result = ts.transpileModule(readFileSync(file.fileName, 'utf8'), {
      compilerOptions: options,
    })
    writeFileSync(
      output,
      result.outputText.replace(/(from\s+['"]\.{1,2}\/[^'"]+)(['"])/g, '$1.mjs$2'),
    )
  }
  const tests = readdirSync(join(root, 'tests/admin'))
    .filter((n) => n.endsWith('.node.mjs'))
    .map((n) => join(root, 'tests/admin', n))
  if (!tests.length) throw new Error('Admin tests missing.')
  const result = spawnSync(process.execPath, ['--test', ...tests], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, TUNECLUE_ADMIN_BUILD: temporary },
  })
  process.exitCode = result.status ?? 1
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
