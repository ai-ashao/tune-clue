# TuneClue Admin V1 · 应用、配置和操作说明

基线：GitHub main `c69db989baf681a8b93c8d1ec9dbeed73c610e0a`，加已交付的 Dodo V1 更新。日期：2026-09-11。

本包是**合并支付依赖的增量源码更新，不是完整网站工程**。前一份 Dodo 包未合并时，本安装器在内存中先计划 Dodo 改动，再计划 Admin 改动；全部检查通过后才一起写入。已原样应用过 Dodo 时使用其原记录，不重复覆盖。任何后续本地修改、格式化后的版本或冲突都会停止，需做差异合并，不能删除校验强行运行。

## 1. 实现范围

后台入口 `/admin`。四个模块：概览、用户与次数、订单与支付异常、识别请求。两个业务操作：重新核对订单、补回某一次异常识别实际扣次。

复用现有 Google 会话、D1 和 Dodo 领域服务；无新的 npm 运行时依赖。未添加现金退款接口、CMS、套餐编辑、任意余额调整、角色管理、密钥编辑或通用 SQL 执行器。

用户侧识别同步升级为稳定 requestId、服务端请求记录、同操作去重、短期结果重放、异常状态和共享安全返还。两条识别路由与前端客户端必须一起应用，不能只复制 admin 文件。

## 2. 在现有项目应用

先提交或备份本地改动，暂停同时改代码的代理。不要把包含真实密钥的文件提交 GitHub。

```bash
# 在解压的更新包根目录
python3 apply.py /你的路径/tune-clue --check
python3 apply.py /你的路径/tune-clue

cd /你的路径/tune-clue
pnpm install --frozen-lockfile
pnpm format:billing
pnpm format:admin
pnpm test:billing
pnpm test:admin
pnpm verify
```

Python 3.10+，Node 22.16+。项目现有 TypeScript、依赖和 lockfile 保持原样，验证时优先用项目安装的 TypeScript。TanStack 自动生成 `src/routeTree.gen.ts`，不手动编辑或覆盖生成树。

`format:admin` 是调用当前项目的 Biome，不表示本包已经在完整项目跑过 Biome。完整构建和既有测试必须在依赖就绪的环境完成。不要重复运行前一份 Dodo 安装器。

## 3. 数据库：只做加法迁移

新增 `0003_admin_recognition.sql`；依赖 `0001_auth_credits.sql` 与 `0002_dodo_billing.sql`。

```bash
pnpm exec wrangler d1 migrations apply tune-clue --local
```

新增表：

- `recognition_attempts`：识别请求、执行状态、账本关联和 24 小时结果重放。
- `admin_operations`：管理员操作编号、60 秒执行租约、状态和结果。
- `admin_audit_logs`：开始与终态审计；数据库触发器阻止更新或删除审计行。

没有修改旧迁移、重置余额或删除旧订单。旧识别没有日志时显示历史不完整，不回填假的成功记录。

**远端迁移未执行。**完成本地验证后，核对目标 D1 并导出备份，再自行执行远端加法迁移。备份含账户数据，不可上传公开仓库。

```bash
pnpm exec wrangler d1 export tune-clue --remote --output=../tuneclue-before-admin.sql
pnpm exec wrangler d1 migrations apply tune-clue --remote
```

## 4. 默认全部关闭；先读后写

所有变量只从服务端 Cloudflare 环境读取，不能使用 `VITE_` 前缀。示例文件会增加下面的空值或默认值，真实 `.env`、`.dev.vars` 不会被覆盖。

```dotenv
ADMIN_ENABLED=false
ADMIN_WRITE_ENABLED=false
ADMIN_USER_IDS=
ADMIN_SITE_ORIGIN=https://tuneclue.com
ADMIN_DEPLOYMENT_LABEL=
AUDD_ESTIMATED_REQUEST_COST_USD=
```

| 变量 | 含义 |
| --- | --- |
| `ADMIN_ENABLED` | 后台页面/API 总开关，false 时拒绝访问 |
| `ADMIN_WRITE_ENABLED` | 仅两个业务操作的写开关，默认 false |
| `ADMIN_USER_IDS` | 允许的本站 users.id，首版填你自己一个 ID；代码最多允许 5 个 |
| `ADMIN_SITE_ORIGIN` | 浏览器访问后台的精确 origin，用于管理员 POST 来源检查 |
| `ADMIN_DEPLOYMENT_LABEL` | 可选部署标记，例如 Local / Staging / TuneClue |
| `AUDD_ESTIMATED_REQUEST_COST_USD` | 可选估算单价，最多 6 位小数；留空显示未配置，不假定免费或收费 |

获取管理员 ID：先用自己的 Google 账户在 TuneClue 正常登录，再到正确 D1 控制台按完整邮箱查询 `users.id`。人工核对邮箱和 ID 后再填入白名单。**不要使用 GitHub ID、Google sub、示例 ID 或“第一个注册的人”。**

先启用 `ADMIN_ENABLED=true`、保持写权限 false，验证只有自己的账户可访问。确认数据与 Dodo/账本一致之后，再决定是否启用两个操作。后台会话要求原 Google 会话在 8 小时内创建，过期只要求后台重新登录，不主动删除公众站会话。

本地开发 origin 应改成实际端口，例如 `http://localhost:3000`。`localhost` 与 `127.0.0.1` 不等价，Cookie、origin 和测试地址须一致。

## 5. 无 Dodo Key 时

四个模块仍可查看已有 D1 数据。缺少迁移时显示“数据结构未就绪”，而不是 0 条记录。Dodo 未配置或环境不同，订单核对不可用。当前新套餐 JSON 不合法不会阻止读取旧订单。

`ADMIN_WRITE_ENABLED` 不是收款开关。`BILLING_ENABLED=false` 只关闭新销售，旧付款/退款核对仍使用正式密钥处理。不要为了暂停收款删除 Webhook 密钥或将正式部署切回 test。

本次没有改变全站 `siteIndexingEnabled=false`，没有开通正式 AudD 计费。

## 6. 四个模块如何读

**概览**按 UTC 的今日/近 7/近 30 自然日查看。已确认付款统计使用本地 `paid_at`，退款订单仍算曾确认付款；不是净收入或银行到账。异常总数按订单/未关联事件/识别请求去重，分类数量不能直接相加。识别统计不含内部 TikTok PoC。

**用户与次数**按完整邮箱（不区分大小写）或本站 ID 搜索。邮箱通过 POST，不进入 URL。可消费账本与测试付款账本分开，负余额如实显示。旧扣次没有请求记录时只能查看，不提供凭旧流水自动补次。

**订单**分三栏：资金事实、订单目标/净发放权益、用户当前余额。购买 20 次且用掉 5 次时，订单净发放仍可为 20，用户余额为 15，不是少发。`last_reconcile_at` 只是最近尝试时间，不保证查询成功。现金退款在 Dodo 发起。

**通知异常**包含未关联订单的事件。旧 review 不删除；只有严格更晚的 processed 记录覆盖、当前订单不再 review 且权益一致，并无更晚待处理通知时，才显示“已覆盖”。时间顺序不明确则保留待核查。

**识别记录**区分 matched、no_match、system_error、indeterminate、rejected。running 超出 120 秒截止会在读取时显示结果不明，不假装已有明确失败记录。AudD 请求尝试在发送前记数，不等于实际计费次数：数据库提交和外部发送无法构成一个原子事务。

## 7. 重新核对订单

从订单详情打开确认框，选择原因并填写说明。服务端读取订单所属用户、checkout session、环境和冻结快照，调用原 Dodo 核对链路，保留金额/商品/商户/用户等校验和 15 秒节流。

`updated` 表示已同步；`unchanged` 表示一致，没有再次加次；`throttled` 不代表又查询过；`payment_not_ready` 不代表付款成功；`review_required` 表示仍有矛盾，不强制发放。业务结果在 operation 中记录，不以 HTTP 200 一概显示成功。

一次操作的业务写入与管理员终态审计在同一个 D1 batch 中提交。租约在实际提交前验证；通知并发不会重复发放。失败可以保留 started/running 记录，60 秒租约过期后用**同一请求编号**恢复。浏览器断网时确认框保留原编号，不需要用户再次付款。

退款、争议和支付记录的金额算法没有另写一套，沿用原支付服务。

## 8. 补回异常扣次

只补原请求实际扣除且尚未返还的 1 次，数量不能编辑，不能换用户，也不是现金退款。自动与人工共用 `refund:{attemptId}`。

- `system_error` 且存在匹配的真实 -1 扣次：可申请返还。
- `matched`、`no_match`、无扣次、历史缺日志：不允许直接补回。
- `running/indeterminate`：必须超过全流程硬截止，且自创建满 15 分钟，并填写核实说明、确认结果无法确认，才允许作为服务补偿。
- 已返还：明确显示未重复加次。

SQL 在提交时重新核对状态、原流水、账户和返还记录，不信任确认框打开时的旧资格。手动返还与自动返还并发只写一条。账本与审计故障一起回滚。未知结果被补偿后仍保留不明事实，迟到结果不会重新扣次。

## 9. 识别请求与缓存

本地上传和 TikTok 请求必须携带 UUID requestId。同一次传输重试复用 ID；同 ID 换媒体返回冲突。请求占位、余额检查和扣次在一个 batch 中完成，每次只有一个执行者调用上游。

正常匹配与未匹配的结果保存后，响应或余额读取失败不触发技术退款。未知网络失败不会自动再次调用 AudD。结果可重放 24 小时，超过期限旧 ID 仍保持已处理状态，不再次消费。用户买次数后明确新点识别才创建新 ID。

只保存来源类型、用于重复请求冲突判断的 SHA-256 指纹、状态、时间和结果元数据（摘要不是加密，也不作为匿名化承诺），不保存原始音视频或原 TikTok URL。24 小时是重放有效期，**不是自动删除承诺**。本版没有 Cron 清理；需要后续运营维护清理过期 result_json，账本关联 ID 和必要审计应保留。未做自动 90 天物理删除。

## 10. 本地浏览器验收

代码附带独立 Playwright 配置，**本交付环境没有运行浏览器验收**。仅可对 localhost/127.0.0.1 执行，不允许指向正式网站。

```bash
pnpm exec playwright install chromium
pnpm exec wrangler d1 migrations apply tune-clue --local
node scripts/seed-admin-local.mjs --confirm-local
```

种子脚本只执行硬编码 `--local` 的 D1 命令，不使用 Google 账户或 Dodo Key；生成本地虚构用户、失败请求与短期会话。按它输出的说明配置本地 `.dev.vars` 并重启 Vite，再复制输出的 `ADMIN_E2E_COOKIE` / `ADMIN_E2E_ATTEMPT` 命令运行 `pnpm e2e:admin`。不要把种子身份、Cookie 或本地开关用于生产。

包含 320/390/768/1440 四种宽度、公众导航/分析隔离、邮箱搜索、Escape 焦点恢复和可选本地实际补次。设置 `ADMIN_E2E_WRITE=1` 才运行补次测试。测试截图/trace 可能含测试或账户数据，不提交公开仓库。

## 11. 停用与回退

紧急停用写能力：`ADMIN_WRITE_ENABLED=false`。关闭整个后台：`ADMIN_ENABLED=false`。这两者不影响旧支付 Webhook 或公众识别服务。

安装器会在项目同级备份本次涉及文件。若尚未有后续修改或格式化，可用：

```bash
python3 apply.py /你的路径/tune-clue --restore /备份目录
```

恢复器会拒绝覆盖安装之后变化的文件；已有后续修改则用版本控制做差异回退。源码回退不删除 0003 的数据，也不逆向改写账本。正式环境不应回退到会重新产生非幂等扣次的旧识别实现而继续收费，优先停用相关入口后修复。

## 12. 交付边界

已实现的 core 测试用真实 SQLite 迁移和实际 SQL；Dodo 提供商响应为隔离夹具，不是真收款。完整 pnpm verify、TanStack/Cloudflare 构建、Playwright、真实 Dodo 与真实 AudD 尚需在依赖/Key 就绪后完成。后台 Key 空缺不妨碍代码开发，但不能把本地 core 通过当成正式收款已验收。

## 12. 实现说明与验收边界

- 页面使用中文表格和可直达的详情页；审计在目标详情里，不增设第五个一级模块。
- 时间窗口、30 条分页、15 分钟不明请求补偿和 8 小时管理员会话沿用设计默认值。
- 不符合返还条件的请求会记录为 `state=review`、`outcome=not_eligible`；本版已鉴权的业务操作可能返回 HTTP 200，但界面明确警示、没有返还。它不表示执行成功。身份/来源/请求字段/环境冲突仍按对应非 2xx 拒绝。
- 服务端 `result_json` 的重放期结束后不会再向用户重放，但不会自动物理删除；审计与财务所需骨架不级联清空。
- 本包测试使用真实 SQLite SQL 和模拟上游响应，不等同线上 D1 或真实支付验收。完整项目构建、原有 Vitest、真实页面与提供商验收结果见更新包 `TEST-REPORT.md`，没有把待执行的 Playwright 测试算成通过。
