import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

if (process.argv.slice(2).join(' ') !== '--confirm-local') {
  console.error(
    'Usage: node scripts/seed-admin-local.mjs --confirm-local\nOnly local D1 fixtures are supported. Never copy these identities or cookies to production.',
  )
  process.exit(1)
}
const now = Date.now()
const token = randomUUID()
const hash = createHash('sha256').update(token).digest('base64url')
const attempt = randomUUID()
const tmp = mkdtempSync(join(tmpdir(), 'tuneclue-admin-fixture-'))
const file = join(tmp, 'fixture.sql')
const sql = `
INSERT OR IGNORE INTO users(id,google_sub,email,name,created_at,updated_at) VALUES ('admin_e2e_operator','admin_e2e_operator','operator@admin-e2e.invalid','本地测试管理员',${now},${now});
INSERT OR IGNORE INTO users(id,google_sub,email,name,created_at,updated_at) VALUES ('admin_e2e_customer','admin_e2e_customer','customer@admin-e2e.invalid','本地测试用户',${now},${now});
INSERT INTO sessions VALUES ('${hash}','admin_e2e_operator',${now},${now + 3600000});
INSERT INTO credit_transactions VALUES ('${randomUUID()}','admin_e2e_customer',1,'welcome_bonus',NULL,'fixture:${attempt}',${now});
INSERT INTO recognition_attempts (id,user_id,request_key,source_kind,payload_fingerprint,status,stage,error_code,created_at,updated_at,execution_deadline_at,finished_at,duration_ms)
VALUES ('${attempt}','admin_e2e_customer','${randomUUID()}','local_file','fixture','system_error','finished','provider-error',${now - 10000},${now},${now + 110000},${now},10000);
INSERT INTO credit_transactions VALUES ('${randomUUID()}','admin_e2e_customer',-1,'recognition','${attempt}','recognition:${attempt}',${now});
`
try {
  writeFileSync(file, sql, { mode: 0o600 })
  const result = spawnSync(
    'pnpm',
    ['exec', 'wrangler', 'd1', 'execute', 'tune-clue', '--local', '--file', file],
    { stdio: 'inherit' },
  )
  if (result.error) throw result.error
  if (result.status !== 0) process.exitCode = result.status || 1
  else
    console.log(
      `\nLOCAL fixture only. In .dev.vars use ADMIN_ENABLED=true, ADMIN_WRITE_ENABLED=true,\nADMIN_USER_IDS=admin_e2e_operator, ADMIN_SITE_ORIGIN=http://localhost:3000.\nThen restart local Vite. Do not change production vars.\n\nADMIN_E2E_COOKIE='${token}' ADMIN_E2E_ATTEMPT='${attempt}' ADMIN_E2E_WRITE=1 pnpm e2e:admin\n`,
    )
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
