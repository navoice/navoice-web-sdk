# SDK-Web — CLAUDE.md

## Project purpose

The Navoice Web SDK — a TypeScript library that gives web apps voice-driven navigation via the same API surface as the iOS and Android SDKs. Ships as both an npm package (`@navoice/web`) and a standalone bundled script (`navoice.min.js`) that can be loaded via `<script>` tag.

## Tech stack

- **Language:** TypeScript 5
- **Build tool:** tsup (CJS + ESM + types) + custom `build.js` (standalone bundle via esbuild)
- **Test framework:** Vitest
- **Browser APIs:** Web Speech API (local STT), MediaRecorder, localStorage
- **Dependencies:** Zero runtime dependencies (all bundled)

## Important folders

```
src/
  index.ts              Public API exports
  Navoice.ts            Main SDK class (voice + text routing, license, STT)
  createNavoice.ts      Higher-level factory API (mounts mic button, handles navigation)
  NavoiceClient.ts      HTTP client (license, interpret, stt)
  LocalRouter.ts        Local keyword/example scorer (mirrors Backend router.js)
  SemanticResolver.ts   Semantic fallback (local vector scoring)
  SemanticCache.ts      Local vector cache
  SessionMemory.ts      In-session context
  LearningStore.ts      Persistent cross-session history (localStorage)
  SpecContext.ts        Spec expansion (aliases, synonyms)
  runtimeSpec.ts        Spec JSON → typed model
  Normalizer.ts         Text normalization
  config.ts             STT config types
  models.ts             HTTP response models
  types.ts              Public result/event types
  version.ts            SDK version constant
  stt/
    CloudSTTProvider.ts  Cloud STT via Backend /api/stt
    WebSpeechSTT.ts      Browser-native Web Speech API STT
  routeAudio.test.ts    Vitest test file
dist/                   Build output (CJS, ESM, types)
navoice.min.js          Standalone browser bundle (esbuild output)
```

## Important files

| File | Purpose |
|---|---|
| `src/Navoice.ts` | Core SDK class — `route()`, `routeAudio()`, `init()`, `onResult` |
| `src/createNavoice.ts` | Factory: mounts mic button, wires navigation, exposes `navoice` handle |
| `src/NavoiceClient.ts` | All Backend HTTP calls |
| `src/LocalRouter.ts` | Offline routing (same logic as Backend `router.js` and SDK-iOS `LocalRouter.swift`) |
| `build.js` | esbuild script that outputs `navoice.min.js` (UMD/IIFE) for `<script>` tag use |
| `package.json` | Package name: `@navoice/web`, version `0.1.0` |
| `PARITY_GAP_ANALYSIS.md` | Documents known gaps vs iOS SDK |
| `PARITY_VERIFICATION_MUST_HAVES.md` | Checklist of required parity items |

## Environment variables

None at SDK level. Configuration is passed programmatically:

```typescript
import { createNavoice, NavoiceSTTConfig } from '@navoice/web';

const sdk = createNavoice({
  spec,
  publishableKey: 'pk_...',
  backendBaseUrl: 'https://api.navoice.io',
  origin: window.location.origin,
  sttConfig: NavoiceSTTConfig.cloudOnly,
  mount: { micButton: '#navoice-mic', badge: '#navoice-badge' },
  navigation: { mode: 'history', routes: { ... }, navigate: router.push },
});
await sdk.init();
```

When loaded as `navoice.min.js`, the SDK is exposed as `window.NavoiceSDK`.

## External services

- **Navoice Backend** — license validate, interpret, STT
- **Web Speech API** (browser built-in) — local STT
- **MediaRecorder API** (browser built-in) — audio capture for cloud STT

## How this project connects to the rest of Navoice

- The primary SDK used by web integrations and the MyCity-Web demo.
- Built output (`navoice.min.js`) is copied to `Navoice-Portal/public/` and `MyCity-Web/public/`.
- API surface mirrors SDK-iOS and SDK-aOS.
- `createNavoice()` is a higher-level API that MyCity-Web uses via `navoiceInit.ts`.

## Do-not-break rules

- **`createNavoice()` / `Navoice` public API** — breaking changes require a version bump.
- **`navoice.min.js` global shape** — must expose `window.NavoiceSDK.createNavoice` and `window.NavoiceSDK.NavoiceSTTConfig`. Portal and MyCity-Web depend on this shape.
- **`LocalRouter.ts` thresholds** — must match Backend `router.js` and SDK-iOS `LocalRouter.swift`. Any change must be tripled across all three.
- **License JWT request/response** — must match the shape Backend produces.
- **`LearningStore.ts`** — uses `localStorage`. Key naming must remain stable across SDK versions to preserve user history.

## Common development tasks

- **Build npm package (CJS + ESM + types):**  `npm run build`
- **Build standalone bundle:** `npm run build:prod` (outputs `navoice.min.js`)
- **Run tests:** `npm test`
- **Watch tests:** `npm run test:watch`
- **Update the Portal/MyCity-Web bundle:** after `npm run build:prod`, copy `navoice.min.js` to `Navoice-Portal/public/` and `MyCity-Web/public/`.

## Build / run / test commands

```bash
npm install
npm run build         # tsup: CJS + ESM + types → dist/
npm run build:prod    # esbuild standalone → navoice.min.js
npm test              # vitest run
npm run test:watch    # vitest watch
```

## Known risks

- **`dist/` vs `navoice.min.js`**: `dist/` (produced by `tsup`) is for npm package consumers. `navoice.min.js` (produced by `build.js` via esbuild) is the standalone `<script>` tag bundle. Portal and MyCity-Web use the standalone bundle, not the npm package. The `navoice.min.js` in the repo root and a possible copy in `dist/` may drift — `npm run build:prod` (esbuild) is the canonical source for the standalone bundle.
- `PARITY_GAP_ANALYSIS.md` documents known gaps vs iOS — some may still be open.
- Web Speech API has limited cross-browser support (Chrome/Edge primarily). Safari support is incomplete.
- `localStorage` use for `LearningStore` may fail in private browsing mode. No fallback documented.
- MediaRecorder output format (`audio/webm`) varies by browser. Backend receives it and re-encodes with ffmpeg — if ffmpeg changes formats, transcription may degrade.
- Version is `0.1.0` — marked `UNLICENSED` in `package.json`. Not yet published to public npm.
- `SemanticCache` is in-memory only (`Map`), resets on page reload. Default TTL: 120 seconds. No explicit flush — stale entries expire naturally. If the spec changes between page loads, the cache is automatically cleared on restart.
- `/api/stt` accepts a `hints` parameter (JSON array of domain words) and a `prompt` override. The backend default `prompt` is Hebrew — non-Hebrew apps must override it. Configure via the SDK's STT config options.
- `LearningStore` boosts `show_choices` results: previously-chosen screens gain up to +0.15 confidence per disambiguation event. localStorage key format: `navoice.learn.{appId}.{screenId}`. Fails silently in private browsing.
