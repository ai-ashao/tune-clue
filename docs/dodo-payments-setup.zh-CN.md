# TuneClue · Dodo Payments V1 接入与启用

基于 `c69db989baf681a8b93c8d1ec9dbeed73c610e0a`。本次接入一次性识别次数包，不接订阅，不迁移原有 Google 账户和免费次数账本，不开启搜索收录。

## 1. 这份更新的范围

新增 `/buy-credits`、`/billing/return`、账户订单记录、余额不足时的购买入口。付款在 Dodo 托管收银台完成；TuneClue 不接收银行卡号。API 使用 Dodo 官方 REST 接口，Webhook 按 Standard Webhooks v1 验签，使用 Cloudflare 原生 fetch / Web Crypto，不新增 npm 运行时依赖。

核心安全规则：订单价格、次数、商品 ID、用户身份全部来自服务端；回跳 URL 的 `status`、`payment_id` 不作为发货依据。付款通知验签后再次向 Dodo 读取权威支付记录，校验商户、用户、订单、环境、商品、数量、币种和金额，然后在一个 D1 batch 中写账并记录处理完成。查询支付状态的补偿接口也走相同校验路径。

测试付款记入 `billing_test_credit_transactions`，**绝不写入可用于真实 AudD 识别的 `credit_transactions`**。用测试卡购买后，账户会显示测试余额，但真实识别余额不会增长。这是有意隔离，不是发货失败。V1 没有自动把测试余额转换成正式余额的功能。

## 2. 合并更新包

这是基于现有仓库的源码更新包，不是独立项目。先保存当前改动，再在解压后的更新包目录执行：

```bash
python3 apply.py /你的项目路径/tune-clue --check
python3 apply.py /你的项目路径/tune-clue
cd /你的项目路径/tune-clue
pnpm install --frozen-lockfile
pnpm format:billing
pnpm test:billing
pnpm verify
```

Python 3.10+；Node 22.16+。安装脚本校验被修改原文件的 Git blob SHA，不会覆盖不同版本的改动。任何冲突都会在写入前报错；不要通过删除校验强行覆盖。脚本会在仓库同级目录备份被改动文件，不修改 `.env`、`.dev.vars`、Git 提交或线上配置。生成的 `.tuneclue-dodo-update.json` 是本地应用记录，不含密钥，可以不提交。

`pnpm format:billing` 仅用项目已有 Biome 格式化/整理本次文件，随后完整验证。`pnpm build` 会由 TanStack 自动更新 `src/routeTree.gen.ts`，不要手工拼接路由树。新增 Node 验收文件使用 `.node.mjs`，不会被现有 Vitest 的 `.test.*` 自动收集。

## 3. 密钥还没有时的行为

默认：

```dotenv
BILLING_ENABLED=false
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_LIVE_PAYMENTS_APPROVED=false
DODO_CREDIT_PACKS_JSON=[]
```

购买页明确显示暂未开放，不显示虚构的可购买套餐；接口拒绝创建收银台。既有识别、登录、分享奖励继续保持原逻辑。没有增加全站部署前必须申请支付账户的硬性要求。

## 4. D1 迁移

只新增 `migrations/0002_dodo_billing.sql`，保留 `0001_auth_credits.sql` 和全部已有用户、余额、奖励记录。

```bash
pnpm exec wrangler d1 migrations apply tune-clue --local
```

远端迁移须在你确认备份和目标数据库后手动执行：

```bash
pnpm exec wrangler d1 export tune-clue --remote --output=../tuneclue-before-billing.sql
pnpm exec wrangler d1 migrations apply tune-clue --remote
```

备份文件含账户数据，不能提交到 GitHub。本次更新没有替你执行远端迁移。新订单表引用用户且不自动随用户删除，以免无意删除支付凭据；后续账户删除应先处理订单与法定保留要求，不能直接级联删除所有支付记录。

## 5. 后面申请 Dodo 时要准备什么

需要同一环境中的 API Key、Webhook 签名密钥、Business ID，以及每个一次性商品的 Product ID。只填 API Key 不足以完成接入。

所有设置都是服务端变量，**绝不能冠以 `VITE_`**。本地 Cloudflare 开发使用 `.dev.vars`（从 `.dev.vars.example` 手动复制并保留原 Google/AudD 配置），线上使用 Worker 的 Variables/Secrets 或 Wrangler secret。代码从 `cloudflare:workers` 的 `env` 读取，不从浏览器环境读取密钥。

| 变量 | 用途 |
| --- | --- |
| `BILLING_ENABLED` | 是否允许新购买；默认 false |
| `DODO_PAYMENTS_ENVIRONMENT` | `test_mode` 或 `live_mode` |
| `DODO_LIVE_PAYMENTS_APPROVED` | 正式环境额外人工确认；默认 false |
| `BILLING_SITE_URL` | 本站可信 origin；线上 `https://tuneclue.com` |
| `DODO_PAYMENTS_API_KEY` | 同环境 API 密钥 |
| `DODO_PAYMENTS_WEBHOOK_KEY` | 同环境端点签名密钥，通常 `whsec_...` |
| `DODO_PAYMENTS_BUSINESS_ID` | 同一 Dodo 商户的 Business ID |
| `DODO_CREDIT_PACKS_JSON` | 服务端套餐 JSON；默认 `[]` |

例如向线上 Worker 写入密钥时：

```bash
pnpm exec wrangler secret put DODO_PAYMENTS_API_KEY
pnpm exec wrangler secret put DODO_PAYMENTS_WEBHOOK_KEY
pnpm exec wrangler secret put DODO_PAYMENTS_BUSINESS_ID
pnpm exec wrangler secret put DODO_CREDIT_PACKS_JSON
```

其余布尔开关和 origin 可放 Worker 普通变量；需要本地值时把同名配置写入 `.dev.vars`。不要把自己的真实 `.dev.vars` 覆盖成示例空文件。

## 6. 商品与定价

首版最多五个固定价格的、**税外 USD 一次性**套餐。暂不支持订阅、PWYW、自定义金额、折扣、购买力平价或本地化价格。Dodo 商品与后台设置应关闭折扣、Localized/Adaptive Pricing 和 PPP，避免用户付款后才发现币种/金额与冻结订单不一致。应用会先读取商品并拒绝不匹配项；成功付款仍要二次校验，不会为了“先发货”跳过金额验证。

下面只是配置格式示例，不是已决定的正式价格和次数：

```json
[
  {"id":"starter","name":"Starter","credits":20,"amount":499,"currency":"USD","productId":"pdt_REPLACE_WITH_TEST_PRODUCT"}
]
```

`amount` 单位为美分，499 表示 4.99 USD；适用税费由 Dodo checkout 计算。真实套餐需由你确认后再启用。正式环境使用正式 Product ID，不能复用测试商品。

当前实现为不自动续费、无预定到期日、不可转让的账户识别次数，不是可提现钱包。这是 V1 的实现默认政策；改成有期限或其他销售规则前，应同步代码、购买页和条款。

## 7. Webhook

端点：

```text
https://tuneclue.com/api/billing/webhook
```

Dodo 后台订阅：`payment.succeeded`、`payment.failed`、`payment.cancelled`、`payment.processing`、`refund.succeeded`，以及全部 `dispute.*` 事件。以后台实际可选事件为准，未使用事件会记录为 ignored。

签名要求 `webhook-id`、`webhook-timestamp`、`webhook-signature`，使用原始请求体，不先 JSON 化再验签。时间容差为前后五分钟。失败返回非 2xx，等待重送；不采用“先 200 再后台发次数”的不可靠方式。

后台发送的示例事件可能没有真实支付记录或 TuneClue 订单。本实现会进行权威回查，因此这种虚拟示例可能验签成功但被拒绝发货。测试完整交付要从 TuneClue 真实创建一笔 **Dodo test checkout**，再用测试支付资料完成，不要把虚拟 ID 当成真实订单。

推荐独立 staging Worker + D1 进行测试。单个部署一次只处理所选环境的密钥；不要混用 test/live。正式服务启动后不要在同一个 Worker 临时切回 test，避免拒绝尚未送达的正式退款通知。

## 8. 订单恢复和去重

创建 checkout 前先写本地订单；前端为同一次操作保留 requestId，服务端按用户、环境和该 ID 去重。上游创建请求失败时不盲目自动重试，避免重复收款会话。

付款回跳页移除 Dodo 附加的邮箱、状态等参数，仅使用本地 order ID 查询本人订单。页面短时间轮询，并可手动“Check status”；服务端补偿查询基于数据库保存的 checkout_session_id，不能由浏览器指定 payment ID。

本地文件购买前只临时保存短音频样本，TikTok 则保存 URL，均绑定账户，恢复窗口 30 分钟。恢复后需要用户明确点击识别，不会因查看付款页自动消耗一次。超过恢复窗口后次数仍在，只需重新选文件。过期标记限制可恢复性，不等于浏览器会在后台自动物理删除 IndexedDB；下一次保存或恢复会替换/清理记录，用户也可清除本站数据。

## 9. 退款和拒付

V1 从 Dodo 后台人工发起退款，不提供一个允许客户端指定退款金额的公共接口。Dodo 处理钱，TuneClue 处理次数。

- 全额成功退款：撤销该包次数。
- 部分成功退款：按累计退款额/原支付总额比例撤销，按整数次数累计向上取整，避免每一小笔都重新额外取整。
- pending/failed 退款不撤销。
- 未解决或商户未胜诉的争议暂停该订单次数；won/cancelled 恢复未被退款的部分。
- 次数已经被用掉时，余额可以变成负数；识别服务原有余额检查会阻止继续消费，不删除历史流水伪造结清。
- 终局争议状态不允许旧通知覆盖；极少数终局被提供商重新审定的情况需要人工核实处理。

法律页已经同步一次性购买、提供商和退款说明，并更新原先断言“尚不销售次数”的测试。上线前仍需确认客服邮箱实际可收信、退款处理流程、页面与 Dodo 审核信息一致。这不是重新引入复杂法律部署门槛。

## 10. 运维与暂停

暂停新销售只设置 `BILLING_ENABLED=false`，保留正式 API/Webhook key，继续处理迟到付款和退款。不要删除历史商品配置对应的订单记录。

排查 SQL（在正确环境的 D1 控制台执行）：

```sql
SELECT id, environment, status, review_reason, created_at
FROM billing_orders WHERE status IN ('review','creating','checkout_failed')
ORDER BY created_at DESC LIMIT 50;

SELECT environment, event_id, state, reason, received_at
FROM billing_events WHERE state IN ('pending','review')
ORDER BY received_at DESC LIMIT 50;
```

`review` 不代表丢单；它表示权威记录与冻结订单有矛盾，不能盲目发次数。修复配置后可让用户 Check status，或从 Dodo 重送对应事件。未知 checkout 会话/创建超时要先核对 Dodo 记录，不建议直接让用户再付一次。当前没有后台 Cron 全量对账服务，依靠可靠 webhook 重送和订单状态页补偿；规模上来后再加定时对账。

正式环境仍需配置适当的 Cloudflare WAF/限流，防止恶意请求耗尽 Worker/D1 资源。付款会话创建已有 D1 持久化的用户级限流；这不等于整个网站已有全局防护。

## 11. 正式收款前验收

先保持 noindex 与销售关闭。依次完成：本地完整 verify、D1 migration、测试 checkout/签名/发放/退款验收、支付账户审核及提现路径确认、正式 AudD 计费配置和识别验收。

确认正式配置使用 `live_mode`、正式 key 和 Product ID，审核购买页价格与政策，然后再设置 `BILLING_ENABLED=true` 和 `DODO_LIVE_PAYMENTS_APPROVED=true`。按 Dodo 允许的方式完成一笔正式支付与退款联合验收后，才开放收录。测试付款通过并不等于真实银行卡付款或 AudD 已验收。

此更新不修改原有 AudD key，也没有替你开通识别付费套餐。原识别接口的网络重试、异常返还等仍应在正式识别验收中核对，不把支付账本测试误当成上游识别全链路测试。

## 12. 官方接口依据（2026-09-11 核对）

- Checkout: https://docs.dodopayments.com/api-reference/checkout-sessions/create
- Get checkout session: https://docs.dodopayments.com/api-reference/checkout-sessions/get-checkouts
- Payment detail: https://docs.dodopayments.com/api-reference/payments/get-payments-1
- Product detail: https://docs.dodopayments.com/api-reference/products/get-products-1
- Webhook signature / delivery: https://docs.dodopayments.com/developer-resources/webhooks

REST 适配器集中在 `src/lib/billing/dodo.ts`；提供商字段与本地业务账本隔离。未来 API 字段调整，先改适配器和验收夹具，再改生产配置。
