# MyCity-Web — AUDIT.md

## What was scanned

All source files in `app/`, `components/`, `public/` (excluding `node_modules/`, `.next/`, `vendor/navoice-web/node_modules/`). `next.config.mjs`, `package.json`, `tailwind.config.ts`, `tsconfig.json`.

## What the project appears to do

A Next.js web demo app showing Navoice voice-driven navigation for a simulated city services application. The SDK (`navoice.min.js`) is loaded from the `public/` folder. When a user clicks the mic button and speaks (or types), the SDK routes the input to one of four tab pages: Taxes, Recycle, Events, or Education.

## Current architecture

- Next.js App Router with a `(tabs)` route group for the four feature pages.
- `NavoiceShell.tsx` renders a persistent mic button and badge overlay across all pages.
- `navoiceInit.ts` is the SDK integration layer — loads the script, calls `createNavoice()`, wires navigation via `router.push`.
- SDK is loaded as a standalone `<script>` tag pointing to `public/navoice.min.js`, not as an npm import.
- Spec is loaded at runtime via `fetch('/spec.json')` (line 143 of `navoiceInit.ts`) — fetches `public/spec.json`. **Confirmed.** `public/mycity_spec.json` also exists in the repo but is not fetched by `navoiceInit.ts`. These two files should be reconciled — either `mycity_spec.json` should be renamed to `spec.json` and become the single source, or the extra file should be removed.

## Main flows

1. **Page load** — `layout.tsx` calls `initNavoice()` → loads `navoice.min.js` → `createNavoice()` → `sdk.init()`
2. **User taps mic** → `startMicRecording()` → `MediaRecorder` captures audio
3. **User taps mic again** → `stopMicRecording()` → blob → `sdk.navoice.routeAudio(blob)`
4. **Result "execute"** → `navigate(routes[screenId])` → Next.js router navigates
5. **Result "present"** → `onPresent()` callback (for modal content)
6. **Text input** → `routeNavoiceText(text)` → same result pipeline

## API endpoints consumed (via SDK)

| Endpoint | Purpose |
|---|---|
| `POST /api/license/validate` | License init |
| `POST /api/interpret` | Route text |
| `POST /api/stt` | Cloud STT |

## Dependencies

```json
next, react, typescript, tailwindcss
```
No Navoice npm package — SDK loaded from `public/navoice.min.js`.

## Missing documentation

- No README at project root.
- No `.env.local` — environment variables are undocumented.
- Purpose of `vendor/navoice-web/` is not documented.
- `spec.json` vs `mycity_spec.json` usage is ambiguous — `navoiceInit.ts` fetches `/spec.json` but `mycity_spec.json` also exists in `public/`.
- No documented deployment instructions.

## Duplicated logic

- `mycity_spec.json` is duplicated across MyCity-iOS, MyCity-Web, and MyCity-aOS.
- `navoice.min.js` is a copy of SDK-Web output — also present in Navoice-Portal.
- `navoiceInit.ts` duplicates mic recording logic that could be inside SDK-Web's `createNavoice()` — but it's separated here to work around the `<script>` tag integration pattern.

## Security concerns

- Without `NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY` set, the SDK uses `"demo-placeholder"` which will fail license validation against the real backend. This is a silent failure in demos.
- `public/navoice.min.js` is served with no subresource integrity check. If the file is tampered, the SDK can be replaced with malicious code.
- `MediaRecorder` captures audio and sends it to `https://api.navoice.io`. Users must consent to microphone access.

## Integration risks

- `vendor/navoice-web/` contains node_modules — if this is used instead of `public/navoice.min.js`, there are two different SDK versions in play.
- `navoiceInit.ts` fetches `/spec.json` but `mycity_spec.json` also exists. If they differ, the demo may behave inconsistently.
- If `navoice.min.js` is not updated after SDK changes, the demo shows outdated routing behavior.
- Cold start on Render (backend) can cause `/api/stt` timeouts in demos.

## Recommended next tasks

1. Add a README with setup, env vars, and SDK update instructions.
2. Clarify and document which spec file (`spec.json` vs `mycity_spec.json`) is the canonical one.
3. Investigate `vendor/navoice-web/` — remove if not needed.
4. Add `.env.local.example` with all required variable names.
5. Automate `navoice.min.js` sync from SDK-Web.
6. Sync `mycity_spec.json` across all three MyCity apps via a shared source (script or CI).
