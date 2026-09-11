# TuneClue Stateful Workspace — Scheme C

## Evidence

- Reference: `/Users/wxj/Downloads/tuneclue-stateful-workspace-prototype-v12-scheme-c.html`
- Desktop evidence captured at 1280 × 720.
- Responsive rules inspected at 900 px and 560 px breakpoints.
- Reference assets are limited to inline geometry and generic interface icons; no external assets are reused.

## Execution mode

Target-native migration using the approved TuneClue Scheme C prototype as the visual source. The
TanStack Start routes, Cloudflare runtime, real TikTok/local-file recognition, Google sign-in,
credits, privacy behavior, and SEO registry remain authoritative.

## Pattern specification

- Sticky 68 px header with a compact dark music mark, four low-emphasis navigation links, and one
  dark sign-in action.
- Centered hero with a small ruled eyebrow, 44–70 px headline, cyan-to-pink accent text, and a
  single short explanatory paragraph.
- Primary workspace capped near 900 px, with a white 26 px-radius shell, two equal mode tabs, and a
  minimum 270 px task surface.
- Active controls are near-black. Cyan indicates selection and progress; pink is decorative only.
- URL state centers an icon, title, explanation, single-line field, primary action, and support note.
- Upload state uses the same geometry with a dashed drop target and explicit file constraints.
- Selected local-file state uses a 1:1 preview/selection grid, a fixed 10-second window, one start
  selector, privacy copy, and one primary action.
- Auth, processing, errors, credits, and results replace the work area instead of accumulating as
  unrelated cards.
- Supporting content carries a low-opacity cyan/pink gradient rhythm through alternating soft bands,
  three-card grids, the compact FAQ panel, state surfaces, and footer. The dark closing CTA remains
  the strongest non-hero gradient so the page still has a clear visual endpoint.
- Search-intent landing pages such as `/tiktok-song-finder` reuse the same shell, hero treatment,
  primary finder geometry, section rhythm, guidance cards, FAQ panel, and closing CTA rather than
  falling back to the neutral starter presentation.
- Below 900 px, grids stack. Below 560 px, URL input/action stack, actions become full width, and
  content side padding becomes 12 px.

## Product-truth deviations

- A valid local file continues to `/identify`; the editor is not embedded on the indexable landing
  page, per the repository's file-tool contract.
- Only public TikTok URLs are accepted; the prototype's generic video-URL wording is narrowed.
- Recognition, auth, credits, and result data use real application services. Demo matches, fake
  progress percentages, and placeholder listening actions are not implemented.
- Starter guide content remains disabled. Recognition tips occupy the reference's additional
  editorial-density role without presenting a fake blog.

## QA gate

- Verify desktop 1440 × 900, tablet 900 × 900, and mobile 390 × 844.
- Verify URL validation, upload transition, selected-file workbench, fixed sample window, auth/error
  state, focus visibility, reduced motion, and zero horizontal overflow.
- Run `pnpm verify`.
