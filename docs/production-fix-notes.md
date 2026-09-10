# TuneClue production fix notes

Base commit: `6f9ebfe96981e1f29afff916a798b03c742e0cd9`.

This patch addresses:

1. **site-wide indexing consistency**
   - `pageHead()` now always combines route intent with `siteIndexingEnabled`;
   - no route can accidentally omit `noindex` while the site-wide switch is off.

2. **canonical host**
   - `www.tuneclue.com` is redirected to `tuneclue.com` with HTTP 308 in global request middleware;
   - `workers_dev` is disabled;
   - both custom domains remain bound so the www request can reach the redirect.

3. **UI identity**
   - adds `Signal Console` design language;
   - branded finder, header auth controls, recognition workbench, result, Earn Credits, and Account;
   - keeps the SEO-first first-viewport contract compact.

## D1 binding still requires the real database ID

The source repository currently does not contain the real D1 `database_id`.

Do not invent it.

After copying the ID from Cloudflare, commit:

```jsonc
"d1_databases": [
  {
    "binding": "TUNECLUE_DB",
    "database_name": "tune-clue",
    "database_id": "<REAL_DATABASE_ID>",
    "migrations_dir": "migrations"
  }
]
```

Then run:

```bash
pnpm cf-typegen
```

## Indexing release

Keep:

```ts
export const siteIndexingEnabled = false
```

while applying this UI change.

After production smoke tests pass, change it to:

```ts
export const siteIndexingEnabled = true
```

Then verify the live origin:

```text
/
robots.txt
sitemap.xml
www.tuneclue.com → 308 tuneclue.com
```

Only then submit the sitemap in GSC.
