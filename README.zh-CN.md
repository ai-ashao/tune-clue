# ShipLean

[English](README.md) | 简体中文

ShipLean 是一个面向编码 Agent 的 TanStack Start 产品脚手架，用来把聚焦的产品想法快速收敛成经过验证的 MVP。

ShipLean 只提供 **TanStack Start**，并正式支持两种产品模式：**SaaS** 与 **Tool**。

这个仓库中的运行时是**产品模板**，不是 ShipLean 官网。ShipLean 公开官网位于独立仓库 `ai-ashao/shiplean-site`。

## Product Modes

产品模式与产品品牌统一在下面配置：

```text
src/lib/product-config.ts
```

```ts
productConfig.mode = 'saas'
// 或
productConfig.mode = 'tool'
```

模板默认使用中性品牌 `Starter Product`，避免复制仓库后仍然生成 ShipLean 品牌的网站。

- **SaaS Mode**：产品价值首页、产品预览、工作流、定价入口、FAQ，以及默认一个 Header 主 CTA。
- **Tool Mode**：task-first 工具首页、Constraints、Value Signals、Completion Highlights、Capabilities，默认没有 SaaS 风格 Header CTA。

详见 [Product Modes](./docs/product-modes.md)。

## 使用下载后的模板

SaaS 示例：

```text
Use $shiplean-quick-start to turn this template into a bilingual feedback SaaS.
```

工具站示例：

```text
Use $shiplean-quick-start to build a free bilingual image utility.
Use the default Tool Landing, keep the first task anonymous, and populate the live Tool Registry.
```

Skill 正式入口是 `.agents/skills/shiplean-quick-start/SKILL.md`。

Skill 会读取仓库契约与产品模式配置，创建独立的 GitHub 私有仓库，限定第一个工作流，完成实现，并以 `pnpm verify` 收尾。

## 本地运行

```bash
pnpm install
pnpm dev
```

## 验证

```bash
pnpm verify
```

验证包含格式/lint、单元契约、Cloudflare-oriented build、严格 TypeScript、HTTP smoke 与 Playwright 浏览器验收。

Tool Landing 浏览器门禁覆盖：

```text
1440 × 900
390 × 844
```

GitHub Actions 会在 Pull Request，以及 push 到 `main` / `dev` 时自动运行验证。

## 当前能力

- TanStack Start、React、严格 TypeScript
- `product.mode = 'saas' | 'tool'`
- 中性的 SaaS / Tool 默认首页与各自 Header 规则
- `shiplean-quick-start` Agent Skill
- Cloudflare-first 构建路径
- canonical / hreflang / robots / sitemap 基线
- 结构化 SEO metadata 审计与 sitemap 全量 SSR metadata 验收
- Tool Landing v0.2 task-first 结构
- Tool Registry 驱动的多语言工具路由、Related Tools、Footer、hreflang 与 sitemap
- Constraints、Value Signals、Completion Highlights、Capabilities、Helpful Guidance
- Product Config / SaaS-site / Tool-site 配置 Validator
- 面向免费、无账号、浏览器本地处理工具的 typed Privacy / Terms 固定模板与上线审查门禁
- 1440×900 与 390×844 浏览器验收

暂未实现：

- 订阅 SaaS 的 Privacy / Terms 模块
- 生产级 Auth / PostgreSQL / 支付 / 邮件 / 对象存储
- Tool Result / Workbench 广告变现系统
- Ads / Analytics 抽象

相关文档：

- [Product Modes](./docs/product-modes.md)
- [Tool Landing Standard v0.2](./docs/tool-landing-standard-v0.2.md)
- [Tool Landing v0.2.1 hardening](./docs/tool-landing-v0.2.1-hardening.md)
- [SEO Metadata Contract v0.1](./docs/seo-metadata-standard.md)
- [UI 控件间距规范](./docs/ui-control-spacing.md)
- [Legal page template](./docs/legal-pages.md)
- [Current feature status](./docs/FEATURE_STATUS.md)
