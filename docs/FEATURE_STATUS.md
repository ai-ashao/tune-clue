# ShipLean 当前功能状态

最后语义核对：2026-09-06。

| 能力 | 当前状态 | 证据或边界 |
|---|---|---|
| TanStack Start + React + strict TypeScript scaffold | 已实现 | 当前只提供 TanStack Start |
| 顶层 Tool / SaaS Product Mode | Candidate 已实现 | `src/lib/product-config.ts` 单一模式入口 |
| Tool SEO Brief Contract | Candidate 已实现 | Tool Mode 必须有 primary keyword / intent / page map / locale / evidence |
| SEO-first starter residue gate | Candidate 已实现 | Starter Guides 默认 noindex；启用前必须替换原 ShipLean guide slugs |
| Explicit Tool indexability | Candidate 已实现 | Registry 仅 `live && indexable === true` 才进入 sitemap |
| Indexable Tool Landing keyword gate | Candidate 已实现 | `seo.primaryKeyword` 缺失时阻断 |
| Internal-link graph acceptance | Candidate 已实现 | broken links / orphan indexable pages / homepage reachability |
| Multilingual keyword intent audit | Candidate 已实现 | Latin token matcher；CJK n-gram；其他非 Latin 要求人工复核 |
| Related Tools relevance floor | Candidate 已实现 | 自动推荐仅保留 positive tag relevance |
| Product Mode route/surface hardening | Candidate 已实现 | Pricing/App 默认随模式切换；Guides 默认关闭 |
| ShipLean 官网 / 模板运行时分离 | 已实现 | 官网归 `ai-ashao/shiplean-site`；模板使用中性 `Starter Product` |
| SaaS default homepage + shell | Candidate 已实现 | Hero / Product Preview / Outcomes / Workflow / Pricing Entry / FAQ / Header CTA |
| Tool default homepage + shell | Candidate 已实现 | task-first Tool Landing；默认无 SaaS Header CTA |
| `shiplean-quick-start` Skill | 已实现 | Tool Mode 先 SEO brief，再建页和功能 |
| `pnpm verify` 一键门禁 | 已实现 | 格式、测试、构建、类型、HTTP smoke、internal links、browser viewport |
| SEO Metadata Contract v0.2 | 已实现 | Metadata + Tool keyword/indexability + multilingual advisory |
| Tool Landing v0.2 task-first fields | Candidate 已实现 | Constraints / Completion / Capabilities / Helpful Guidance |
| Tool localized-route source of truth | Candidate 已实现 | Registry 驱动 Tool hreflang / switch / sitemap / Related / Footer |
| Tool Directory Footer | Candidate 已实现 | site navigation + live Tool Registry |
| Tool reference routes | 已实现 | text + realistic upload fixtures，均 declarative noindex |
| First Viewport browser acceptance | 已实现 | 1440×900 与 390×844 |
| Free local Tool Privacy / Terms template | 已实现 | 仅覆盖免费、无账号、输入本地处理的工具 |
| Legal production review gate | 已实现 | `pnpm deploy` 前置严格 Validator |
| Subscription SaaS legal template | 未实现 | Product Mode 不代表 SaaS legal 已完成 |
| Result / Workbench monetization | 未实现 | 暂不加入 Landing |
| 生产认证、PostgreSQL、支付、邮件、对象存储 | 未实现 | 后续阶段 |

Tool Landing v0.2、Product Modes 与 SEO-first Tool workflow 当前仍是 candidate。稳定晋升需要真实产品 consumer 证据。
