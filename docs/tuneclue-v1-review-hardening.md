# TuneClue V1 review hardening

Base reviewed commit: `4817e4762978ba340810208ca471dd908b5b3073`.

This overlay addresses the first code review findings:

- recognition endpoint now has a bounded streaming body reader, WAV-only sample policy, and a best-effort per-IP app-layer rate limit;
- the app-layer rate limit is explicitly **not** treated as a durable global quota — production should also use a Cloudflare rate-limit/WAF rule;
- `/about` and `/contact` no longer expose ShipLean starter copy while indexable;
- the two TuneClue money-page configs are now passed through `validateToolLandingConfig`;
- Free / Online / No installation / No signup claims are explicit and truthful;
- external artwork is restricted to known provider CDN hosts and CSP is aligned with that allowlist;
- pending local `File` state is consumed once rather than retained in the module global;
- local browser file limit is reduced from 100 MB to 40 MB and an unnecessary ArrayBuffer copy is removed;
- TikTok UI is hidden from the homepage while the feature flag is off, and the noindex route shows a user-facing unavailable state instead of internal launch-gate copy.

Still required before production launch:

1. configure a real `AUDD_API_TOKEN`;
2. smoke-test one known clip end-to-end;
3. validate actual MP4/WebM browser decoding on target desktop/mobile browsers;
4. configure Cloudflare production rate limiting before public traffic;
5. keep `VITE_ENABLE_TIKTOK=false` until the extractor PoC passes.
