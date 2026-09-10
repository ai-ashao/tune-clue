# TuneClue V1 implementation status

This overlay was authored against `ai-ashao/tune-clue` at initial commit
`6f29b559c7407e4a7d9d8fba5e72055ed809c807`.

## Implemented in this overlay

- Product identity switched from ShipLean starter to **TuneClue Tool Mode**.
- SEO brief: generic `song finder by video` + TikTok wedge.
- Tool registry with `video-song-finder` and `tiktok-song-finder` live.
- Tool-site navigation without SaaS CTA, Pricing, Workflow, or Guides.
- Generic homepage Tool Landing.
- Separate TikTok Tool Landing using the same authenticated credit flow.
- `/identify` noindex workbench.
- Browser-first local media decode → 16 kHz mono WAV short sample.
- AudD Standard Recognition server adapter.
- Normalized matched / no-match / provider-error result states.
- Unit tests for AudD normalization + SEO/product/registry contracts.
- TuneClue Wrangler/env naming.

## TikTok extractor

TikTok link recognition is enabled by default. `VITE_ENABLE_TIKTOK=false` remains an emergency kill
switch. The public endpoint accepts allowlisted public TikTok HTTPS URLs, requires the existing Google
session and credit ledger, refunds provider/extractor failures, and does not expose direct media URLs.

The internal bearer-token PoC endpoint remains separate for extractor diagnostics.

### Pancake / paid credits

Environment placeholders are present, but real-money code is not enabled in this overlay. The frozen V1
requires production identity + append-only ledger + webhook verification + product-specific legal facts
before real checkout can launch.

## Required local verification after applying

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm typecheck
pnpm e2e
pnpm e2e:browser
```

Then add `AUDD_API_TOKEN` locally and test one known short audio sample through `/identify`.

## Local-media gate

The browser path uses `AudioContext.decodeAudioData()` first. This is intentionally light and avoids
shipping ffmpeg.wasm before evidence says it is needed.

It must be tested on the actual target browsers. If MP4 audio decoding is not reliable enough, the next
step is a dynamically loaded ffmpeg.wasm fallback **after file selection**, not server-side full-video
upload.
