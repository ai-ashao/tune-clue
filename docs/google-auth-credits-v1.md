# TuneClue Google Auth + Free Credits V1

Base commit: `4e7f99af7970a23c9da66535056c7c39ec6d2489`.

## Frozen V1 growth flow

```text
SEO visitor
→ upload / choose song position
→ Find song
→ Google sign-in required at recognition time
→ first Google account receives 1 welcome credit
→ recognition consumes 1 credit
→ result
→ optional Earn Credits
   ├─ WhatsApp +1 once
   ├─ Telegram +1 once
   └─ X +1 once
→ max free total = 4 recognition credits
```

Login copy intentionally sells the outcome, not the accounting unit:

```text
Unlock free song recognition
Sign in with Google to identify this song for free.
No card required.
```

Credits are introduced after the user has experienced the product.

## D1 setup

Create D1:

```bash
pnpm exec wrangler d1 create tune-clue
```

Copy the returned database ID into `wrangler.jsonc` and enable:

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

Apply migrations:

```bash
pnpm exec wrangler d1 migrations apply tune-clue --local
pnpm exec wrangler d1 migrations apply tune-clue --remote
pnpm cf-typegen
```

## Google OAuth setup

Create one Google OAuth 2.0 Web Application.

Production redirect URI:

```text
https://tuneclue.com/api/auth/google/callback
```

Configure server secrets:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

Do not expose either as `VITE_*`.

## Credit accounting

The ledger is append-only.

- new Google account: `welcome_bonus +1`
- recognition attempt: `recognition -1`
- provider/configuration failure: `refund +1`
- no-match still consumes the recognition credit
- each share platform: `share_bonus +1`, one time per Google user

## Share rewards

V1 uses share-intent URLs only; no WhatsApp, Telegram, or X developer API is required.
The site cannot prove that a user completed a final social post. The reward is intentionally low-cost and one-time, capped at three share credits per Google account.

## OAuth resume

When an unauthenticated user clicks recognition:

1. the browser prepares the ~10 second WAV sample locally;
2. the short sample is saved temporarily to IndexedDB;
3. Google OAuth redirects away and back;
4. `/identify?resume=1` restores and deletes the temporary sample;
5. the authenticated recognition request is sent.

The full local file still is not uploaded.

## Still outside this phase

- Pancake checkout
- paid credit packs
- subscription
- TikTok extractor
- referral tracking
- verified social-post APIs
