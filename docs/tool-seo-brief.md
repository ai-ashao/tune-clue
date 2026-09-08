# Tool SEO Brief Contract

Status: **SEO-first handoff contract**.

ShipLean does not perform keyword discovery, SERP scraping, search-volume estimation, or competitor scoring. Those belong to SEO/research skills and human research.

ShipLean **does** require the research result to be handed into Tool Mode before the product is treated as SEO-first.

## Required handoff

Populate:

```text
src/modules/tool-seo-brief.ts
```

with a `ToolSeoBrief`:

```ts
{
  status: 'ready',
  primaryKeyword: 'threads downloader',
  localizedPrimaryKeywords: {
    'zh-CN': 'Threads 下载器',
  },
  searchIntent: 'download',
  primaryPage: '/',
  supportingKeywords: [
    'threads video downloader',
    'download threads video',
  ],
  firstBatchPages: [
    {
      keyword: 'threads downloader',
      path: '/',
      pageType: 'tool',
      locale: 'en',
    },
    {
      keyword: 'threads video downloader',
      path: '/threads-video-downloader',
      pageType: 'tool',
      locale: 'en',
    },
  ],
  locales: ['en'],
  evidence: [
    {
      source: 'manual SERP review',
      note: 'Tool intent dominates the first page.',
    },
  ],
}
```

## Why this is a hard gate

Tool Mode follows:

```text
keyword / SERP evidence
→ search intent
→ page map
→ implementation
→ on-page SEO
→ internal links
→ indexability
→ verification
```

It must not silently become:

```text
idea
→ build product
→ add metadata later
```

When `productConfig.mode === 'tool'`, the checked-in SEO Brief must validate before `pnpm verify` can pass.

## First-batch page map

Do not force a fixed number of pages from the template. The research determines the page set.

Supported page types:

```text
tool
guide
category
```

Each page needs:

- a target keyword;
- a root-relative path;
- a page type;
- a locale when the page is locale-specific.

The primary page must appear in `firstBatchPages`.

## Category Hub model

A category hub is not a thin list page. Keep it lightweight, but give it a clear search intent:

```text
H1
short category-intent description
core tool links
related Guides when real and indexable
task-specific Guidance / FAQ only when useful
```

Do not create a complex Category DSL in ShipLean. Product repositories own the actual category content and composition.

## Indexability

Indexability is earned, not inferred from feature availability.

For Tool Registry entries:

```ts
status: 'live'
indexable: true
```

Both are required before the route enters the sitemap.

For Tool Landing configs:

```ts
seo: {
  primaryKeyword: '...',
  indexable: true,
}
```

An indexable Tool Landing without a `primaryKeyword` fails validation.

QA/reference routes set:

```ts
indexable: false
```

## Starter Guides

ShipLean's built-in implementation guides are starter documentation, not product SEO content.

Therefore Guides are disabled by default:

```text
no primary navigation
no sitemap
noindex
```

Only enable the Guides surface after replacing the starter guides with real product guidance. The SEO-first residue gate blocks indexable Guides while the original ShipLean guide slugs remain.

## Internal links

`pnpm e2e` now audits the sitemap link graph:

- broken same-origin internal links fail;
- indexable orphan pages fail;
- indexable pages unreachable from the homepage fail;
- pages deeper than three internal-link clicks emit a warning.

Related Tools automatic fallback also requires positive tag relevance. It no longer fills empty slots with unrelated live tools.
