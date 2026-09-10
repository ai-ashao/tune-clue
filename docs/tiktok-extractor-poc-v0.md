# TuneClue TikTok Extractor PoC v0

Base commit:

```text
6f9ebfe96981e1f29afff916a798b03c742e0cd9
```

## Status

This implements a **Cloudflare-native feasibility probe**, not the public TikTok Song Finder release.
Keep:

```text
VITE_ENABLE_TIKTOK=false
```

The public homepage/tab must remain hidden and `/tiktok-song-finder` must remain noindex until the
production gate passes.

## What is implemented

Internal endpoint:

```text
POST /api/tiktok/poc
Authorization: Bearer <TIKTOK_POC_TOKEN>
```

Actions:

```text
resolve
probe
recognize
```

### `resolve`

```text
public TikTok URL
→ validate TikTok host
→ manually follow TikTok-only redirects
→ fetch public page HTML
→ parse SSR hydration JSON
→ read music.playUrl / video.playAddr when present
→ return sanitized metadata/capability result
```

Supported page data strategies:

```text
1. __UNIVERSAL_DATA_FOR_REHYDRATION__
2. SIGI_STATE
3. TikTok official oEmbed only as metadata/canonical fallback
```

The oEmbed fallback is useful for identity and metadata but is **not** treated as a raw-audio API.

### `probe`

Does everything in `resolve`, then performs a bounded media read from the same Cloudflare Worker.
This tests the critical question:

> Is the signed TikTok CDN URL actually readable from the Worker that extracted it?

The probe reads at most 64 KB and reports HTTP status, content type, range support and bytes read.

### `recognize`

If TikTok exposes a trusted direct `music.playUrl`:

```text
TikTok URL
→ SSR page
→ direct music URL
→ same Worker fetches audio
→ AudD Standard
→ normalized result
```

This avoids adding FFmpeg or a VPS for the first experiment.

## Deliberate limits

- 5 redirect maximum;
- redirects may not leave the TikTok host allowlist;
- public HTTPS links only;
- no user TikTok cookies;
- no TikTok login;
- no private/deleted-content bypass;
- no headless browser;
- no X-Bogus/signature generation;
- no residential proxy;
- no persistent TikTok media;
- public feature flag stays off;
- page HTML bounded to 4 MB;
- direct audio bounded to 9 MB before AudD;
- PoC endpoint protected by a server-only bearer token and app-layer rate limit.

## Why direct music audio first

A TikTok video page may expose both:

```text
music.playUrl
video.playAddr
```

For TuneClue, `music.playUrl` is the useful low-complexity path because AudD accepts audio directly.
If only `video.playAddr` is available, the result reports:

```text
needsTranscodingFallback: true
```

That case is intentionally not solved with a heavyweight server stack in this phase.

## Configure

Generate a long random token and store it as a Worker secret:

```bash
pnpm exec wrangler secret put TIKTOK_POC_TOKEN
```

`AUDD_API_TOKEN` must also be configured before using `action=recognize`.

Do **not** use a `VITE_` prefix for the PoC token.

## Single probe

```bash
curl -X POST 'https://tuneclue.com/api/tiktok/poc' \
  -H 'Authorization: Bearer YOUR_POC_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{
    "url":"https://www.tiktok.com/@creator/video/POST_ID",
    "action":"probe"
  }'
```

Typical useful response fields:

```json
{
  "ok": true,
  "capability": {
    "directAudio": true,
    "directVideo": true,
    "canAttemptAudDWithoutTranscoding": true,
    "needsTranscodingFallback": false
  },
  "probes": {
    "audio": {
      "ok": true,
      "status": 206,
      "bytesRead": 65536
    }
  }
}
```

Signed CDN query parameters are not returned to the caller. The response only exposes sanitized
media host/path metadata.

## Actual recognition PoC

```bash
curl -X POST 'https://tuneclue.com/api/tiktok/poc' \
  -H 'Authorization: Bearer YOUR_POC_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{
    "url":"https://www.tiktok.com/@creator/video/POST_ID",
    "action":"recognize"
  }'
```

This is an internal test and does not consume the user's TuneClue credit ledger. Do not expose the
PoC token to browser code.

## 20-link production-like gate

Use at least:

```text
10 music-backed normal videos
5 original-sound videos
3 longer videos
2 vm.tiktok.com / vt.tiktok.com short links
```

Run the included helper:

```bash
TIKTOK_POC_TOKEN='...' \
node scripts/tiktok-poc-check.mjs \
https://tuneclue.com \
'https://www.tiktok.com/@.../video/...' \
'https://vm.tiktok.com/...'
```

Default action is `probe`.

For AudD:

```bash
TIKTOK_POC_ACTION=recognize \
TIKTOK_POC_TOKEN='...' \
node scripts/tiktok-poc-check.mjs \
https://tuneclue.com \
'https://www.tiktok.com/@.../video/...'
```

## Gate

### Pass

Proceed toward production integration only if ordinary public URLs are stable enough from the
Cloudflare runtime. Recommended initial threshold:

```text
resolve success >= 80%
```

Then separately measure direct-audio coverage and readable-audio coverage. Do not hide failures in a
single aggregate percentage.

### Partial pass

If `video.playAddr` coverage is high but direct music audio is materially lower, measure the gap.
Only then decide whether a lightweight server-side audio extraction service is justified.

### Fail

If Cloudflare page requests are frequently blocked, or signed CDN audio is commonly unreadable from
the Worker, stop expanding this parser. Evaluate a small external extractor API/service instead of
jumping directly to a proxy/headless/VPS stack.

## Expected failure codes

```text
invalid-url
upstream-blocked
upstream-rate-limited
upstream-failed
post-unavailable
structured-data-missing
audio-url-missing
media-unavailable
media-too-large
provider-error
```

## External facts behind the PoC

TikTok's current developer documentation documents a public oEmbed endpoint for video embed
metadata and a hosted player at `/player/v1/{post_id}`. Neither gives TuneClue a documented direct
raw-audio endpoint. The PoC therefore tests only data returned in ordinary public video pages and
stops if that public Cloudflare-native path is not sufficiently reliable.
