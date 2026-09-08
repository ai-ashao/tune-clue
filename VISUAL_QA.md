# Visual QA

Verified on 2026-08-27 against the local TanStack Start development server.

| Surface | Viewport | Result |
| --- | --- | --- |
| English home | 1440 × 1000 | Compact top navigation and a single vertical reading axis: hero copy, Quick Start panel, repository evidence, workflow, and product boundaries |
| Chinese home | 1440 × 1000 | Chinese document language and localized hero content rendered without console errors |
| English home | 390 × 844 | The same top-to-bottom sequence is preserved with no horizontal overflow |
| Local sandbox login | 1280 × 900 | Login action completed and navigated to the protected dashboard |

Browser console was free of application warnings and errors on the English desktop, Chinese desktop, mobile, login, and protected dashboard checks.

Repository verification: `pnpm verify` passed all 10 tests, client and server production builds, strict TypeScript, and the fresh-server smoke test.
