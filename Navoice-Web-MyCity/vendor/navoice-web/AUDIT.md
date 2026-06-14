# SDK-Web — AUDIT.md

## What was scanned

All TypeScript source files under `src/`, `build.js`, `package.json`, `tsconfig.json`, and existing docs: `README.md`, `TROUBLESHOOTING.md`, `PARITY_GAP_ANALYSIS.md`, `PARITY_VERIFICATION_MUST_HAVES.md`, `VERIFICATION.md`.

## What the project appears to do

A TypeScript SDK that adds voice-driven navigation to web apps. It mirrors the Navoice iOS SDK API surface. Developers configure it with a `spec.json` and a `publishableKey`, and it handles license validation, local keyword routing, cloud STT, and navigation result delivery. Can be used as an npm package (`@navoice/web`) or loaded as a standalone script (`navoice.min.js`).

## Current architecture

- Single TypeScript library, zero runtime dependencies.
- `Navoice` class is the core — init, route (text), routeAudio (blob), license management.
- `createNavoice()` is a higher-level factory that wires mic button DOM events, navigation callbacks, and exposes a simpler API.
- `LocalRouter` runs entirely in-browser (no network) for common intents.
- STT providers: `WebSpeechSTT` (local, browser API) and `CloudSTTProvider` (multipart POST to Backend).
- `LearningStore` persists to `localStorage`. `SemanticCache` caches semantic vectors locally.
- Build: `tsup` for the npm package, `build.js` (esbuild) for the standalone bundle.

## Main flows

1. **Init** — `createNavoice()` → `sdk.init()` → validate license → mount mic button
2. **Text route** — `sdk.navoice.route(text)` → normalize → `LocalRouter` → cloud fallback if needed
3. **Audio route** — mic button click → `MediaRecorder` captures audio → blob → `routeAudio(blob)` → STT → route
4. **Result** — `onResult(result)` → app navigates or shows choices

## API endpoints consumed

| Endpoint | Purpose |
|---|---|
| `POST /api/license/validate` | Validate publishable key, get JWT |
| `POST /api/interpret` | Route text to screen |
| `POST /api/stt` | Cloud STT (audio → text) |

## Dependencies

Build-only: `tsup`, `esbuild`, `typescript`, `vitest`. No runtime dependencies.

## Missing documentation

- Existing `README.md` covers installation and basic use — verify currency.
- `PARITY_GAP_ANALYSIS.md` documents open gaps vs iOS (review and close or update).
- `PARITY_VERIFICATION_MUST_HAVES.md` contains a checklist — status unknown (completed vs. pending unclear).
- No API reference / JSDoc for `Navoice` class public methods.
- No changelog.

## Duplicated logic

- `LocalRouter.ts` duplicates `src/router.js` (Backend) and `LocalRouter.swift` (SDK-iOS). Three codebases must stay in sync manually.
- `Normalizer.ts` duplicates `Normalizer.swift` and `TextNormalizer.kt` in Android.
- `SemanticResolver.ts` duplicates `SemanticResolver.swift` and `SemanticResolver.kt`.

## Security concerns

- `publishableKey` is embedded in client-side code. This is intentional (public key) but documented guidance to developers is needed.
- `LearningStore` stores navigation history in `localStorage` — not encrypted. On shared devices, this could expose navigation patterns.
- The license JWT is stored in `localStorage` (prefix: `navoice.license.`). Exposed to XSS attacks on the host page.
- MediaRecorder captures raw audio and sends it to the backend. The SDK should clearly document this data flow in privacy terms.

## Integration risks

- `navoice.min.js` must be kept in sync manually across Navoice-Portal and MyCity-Web. Stale copies will differ in behavior from the latest SDK.
- Web Speech API is non-standard on some browsers/OS combinations. Fallback to cloud STT must be explicitly configured.
- The default `sttConfig` is `NavoiceSTTConfig.localOnly`, which resolves to `{ mode: 'localOnly', cloudFallbackEnabled: false }`. Both `mode` and `cloudFallbackEnabled` are real properties on the STT config object — this is correct. The four modes are `localOnly`, `cloudOnly`, `hybrid`, `disabled` (not `localWithCloudFallback` as stated elsewhere — that name does not exist in source). Cloud STT must be explicitly opted into — easy to misconfigure for first-time integrators.
- If `window.location.origin` returns an empty string (e.g. `file://`), license validation will fail.

## Recommended next tasks

1. Review and close items in `PARITY_GAP_ANALYSIS.md`.
2. Add doc-comments to all public exports in `src/index.ts`.
3. Add test coverage for `LocalRouter.ts` and `SemanticResolver.ts`.
4. Automate copying `navoice.min.js` to Portal and MyCity-Web after builds.
5. Document `localStorage` keys used by `LearningStore` and `SemanticCache`.
6. Consider a CHANGELOG.md for tracking version changes.
7. Decide on npm publishing strategy and update `"license"` field from `"UNLICENSED"`.
