# MyCity-Web — CLAUDE.md

## Project purpose

A reference / demo Next.js web app demonstrating Navoice SDK-Web integration in a municipal services context. Same feature set as `MyCity-iOS` and `MyCity-aOS` — Taxes, Recycle, Events, Education — navigable by voice. Used for demos and as an integration example.

## Tech stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **SDK integration:** `navoice.min.js` loaded as a `<script>` tag (standalone bundle from SDK-Web)
- **Package manager:** npm

## Important folders

```
app/
  layout.tsx              Root layout (loads navoiceInit, renders NavoiceShell)
  page.tsx                Landing / home page
  navoiceInit.ts          SDK initialization logic (mic recording, navigation wiring)
  globals.css             Global styles
  (tabs)/
    taxes/                Taxes tab page
    recycle/              Recycle tab page
    events/               Events tab page
    education/            Education tab page
components/
  NavoiceShell.tsx        Persistent mic button + badge UI overlay
  DemoPageLayout.tsx      Shared layout for tab pages
public/
  navoice.min.js          Bundled SDK-Web (must stay in sync with SDK-Web/navoice.min.js)
  mycity_spec.json        Navoice spec (task → route mapping)
  spec.json               Alternative/test spec
vendor/navoice-web/       Local vendor copy of SDK-Web node_modules (Needs confirmation)
```

## Important files

| File | Purpose |
|---|---|
| `app/navoiceInit.ts` | Full SDK init: loads `navoice.min.js`, calls `createNavoice()`, wires mic button |
| `app/layout.tsx` | Root layout — initializes Navoice on client side |
| `components/NavoiceShell.tsx` | Mic button + listening badge UI |
| `public/navoice.min.js` | Pre-bundled SDK — do not edit; replace from SDK-Web builds |
| `public/spec.json` | **The spec file actually loaded at runtime** — `navoiceInit.ts` calls `fetch("/spec.json")` |
| `public/mycity_spec.json` | An alternative spec file present in the repo but **not fetched by default** — reconcile or remove |
| `next.config.mjs` | Next.js config |
| `tailwind.config.ts` | Tailwind config |

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY` | Navoice publishable key for this app |
| `NEXT_PUBLIC_NAVOICE_BACKEND_BASE_URL` | Backend base URL (default: `https://api.navoice.io`) |
| `NEXT_PUBLIC_NAVOICE_SDK_VERSION` | SDK version string (for backend telemetry) |
| `NEXT_PUBLIC_NAVOICE_DEBUG` | Set to `"1"` to enable verbose console logging |

No `.env` or `.env.local` file was found in this project root. These variables may be unset (SDK falls back to demo-placeholder key and default backend URL). Needs confirmation on how this app is deployed.

## External services

- **Navoice Backend** (via SDK) — license validate, STT, interpret
- **Web Speech API** (browser) — local STT

## How this project connects to the rest of Navoice

- Integrates SDK-Web via `navoice.min.js` (must be kept in sync with SDK-Web builds).
- Uses `mycity_spec.json` which mirrors the spec in `MyCity-iOS` and `MyCity-aOS`.
- Demonstrates the same user flows as the iOS and Android demo apps, on web.
- Used in demos — the Portal demo page likely loads this app or a similar implementation.

## Do-not-break rules

- **`public/navoice.min.js`** — do not edit directly. Replace by copying from SDK-Web after a build.
- **`public/mycity_spec.json`** task IDs — must match the route keys in `navoiceInit.ts`. Changing IDs without updating both will break voice navigation.
- **`#navoice-mic` DOM element** — `NavoiceShell.tsx` renders this button. `navoiceInit.ts` selects it by ID. The ID must not change.
- **`#navoice-badge`** — same constraint as mic.
- **`navoiceInit.ts`** — initializes SDK once via `__navoiceInitialized` guard. Do not call `initNavoice()` multiple times.

## Common development tasks

- **Update the SDK:** copy new `navoice.min.js` from SDK-Web/dist (after `npm run build:prod`) to `public/navoice.min.js`.
- **Update the spec:** edit `public/mycity_spec.json`. Ensure IDs match `routes` map in `navoiceInit.ts`.
- **Add a new tab:** add a route in `app/(tabs)/`, update `routes` map in `navoiceInit.ts`, add task in `mycity_spec.json`.
- **Enable debug logging:** set `NEXT_PUBLIC_NAVOICE_DEBUG=1` in `.env.local`.
- **Test voice nav:** `npm run dev`, open browser, allow mic, click mic button.

## Build / run / test commands

```bash
# Install
npm install

# Development server
npm run dev       # http://localhost:3000

# Production build
npm run build

# Start production
npm start
```

## Known risks

- `vendor/navoice-web/` contains a local vendor copy of SDK-Web node_modules. Purpose and freshness are unclear. May cause confusion about which SDK version is actually running.
- No `.env.local` found — the app may run with `demo-placeholder` publishable key, which means the SDK may not validate against the backend.
- `navoice.min.js` is a manually managed file. If SDK-Web is updated without updating this file, the demo shows stale behavior.
- `spec.json` and `mycity_spec.json` both exist in `public/` — unclear which one the app uses at runtime (depends on `navoiceInit.ts` fetch path).
