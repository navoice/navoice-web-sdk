# Navoice Web SDK

Voice navigation for web apps: users speak commands; the SDK returns structured results from your navigation spec.

Place `navoice.min.js` in your app, load it before your client bootstrap, and handle `NavoiceResult` in `navoice.onResult`.

⸻

## Installation

1. **Copy SDK**  
   Place the bundle at `public/navoice.min.js`.

2. **Load SDK** (Next.js App Router)

   ```tsx
   import Script from "next/script";

   <Script src="/navoice.min.js" strategy="beforeInteractive" />
   ```

3. **Environment variables** — create `.env.local`:

   ```env
   NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY=
   NEXT_PUBLIC_NAVOICE_BACKEND_BASE_URL=https://api.navoice.io
   ```

   Restart the dev server after changes.

4. **Domain** — register your app origin (e.g. `http://localhost:3000`) under **Allowed Identifiers** in the Navoice Portal.

⸻

## Quick Start (Recommended Integration)

Recommended steps: (1) load `navoice.min.js` in `layout.tsx`, (2) add `NavoiceInit.tsx`, (3) add `NavoiceShell.tsx`, (4) map routes in `navoice.onResult`.

### Step 1 — Create spec

`public/spec.json` — your navigation spec (must be fetchable from the browser).

### Step 2 — Create `NavoiceInit.tsx`

`app/NavoiceInit.tsx`

```tsx
"use client";

import { useEffect, useRef } from "react";

export default function NavoiceInit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      const specRes = await fetch("/spec.json");

      if (!specRes.ok) {
        console.error("Failed to load spec.json");
        return;
      }

      const spec = await specRes.json();

      const sdkGlobal = (window as any).NavoiceSDK;

      if (!sdkGlobal) {
        console.error("Navoice SDK not loaded");
        return;
      }

      const sdk = sdkGlobal.createNavoice({
        publishableKey: process.env.NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY,
        backendBaseUrl:
          process.env.NEXT_PUBLIC_NAVOICE_BACKEND_BASE_URL ||
          "https://api.navoice.io",
        spec,
        mount: {
          micButton: "#navoice-mic",
          badge: "#navoice-badge",
          licenseBanner: "#navoice-license-banner",
        },
        navigation: {
          mode: "history",
          routes: {},
        },
      });

      await sdk.init();

      const navoice = sdk.navoice;
      const sdkOnResult = navoice.onResult;

      navoice.onResult = (result: any) => {
        sdkOnResult?.(result);

        if (result.kind === "execute") {
          window.location.hash = `#/${result.screenId}`;
        }
      };
    }

    init();
  }, []);

  return null;
}
```

The Quick Start uses `window.location.hash` only as a minimal routing example. In real applications, replace that branch with your framework router (for example `router.push(...)` in Next.js App Router — see **Handling Results**).

### Step 3 — Create `NavoiceShell.tsx`

`app/NavoiceShell.tsx`

```tsx
"use client";

export function NavoiceShell() {
  return (
    <>
      <div id="navoice-license-banner" />
      <button id="navoice-mic" type="button">
        🎤
      </button>
      <span id="navoice-badge" />
    </>
  );
}
```

### Step 4 — Add to `layout.tsx`

```tsx
import Script from "next/script";
import type { ReactNode } from "react";
import NavoiceInit from "./NavoiceInit";
import { NavoiceShell } from "./NavoiceShell";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Script src="/navoice.min.js" strategy="beforeInteractive" />
        <NavoiceInit />
        <NavoiceShell />
        {children}
      </body>
    </html>
  );
}
```

`NavoiceInit` must render after the SDK script loads. Using `strategy="beforeInteractive"` ensures the SDK is available during initialization.

⸻

## Handling Results

Handle navigation in `navoice.onResult` in the same client module where you call `createNavoice` and `await sdk.init()` (typically `NavoiceInit.tsx`). Always capture the factory handler and invoke it first (`sdkOnResult?.(result)`) so mic state and badge updates stay correct.

For **Next.js App Router**, replace the Quick Start `window.location.hash` branch with `useRouter()` from `next/navigation` and `router.push(...)`. Full example (drop-in replacement for the Step 2 component):

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function NavoiceInit() {
  const router = useRouter();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      const specRes = await fetch("/spec.json");

      if (!specRes.ok) {
        console.error("Failed to load spec.json");
        return;
      }

      const spec = await specRes.json();

      const sdkGlobal = (window as any).NavoiceSDK;

      if (!sdkGlobal) {
        console.error("Navoice SDK not loaded");
        return;
      }

      const sdk = sdkGlobal.createNavoice({
        publishableKey: process.env.NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY,
        backendBaseUrl:
          process.env.NEXT_PUBLIC_NAVOICE_BACKEND_BASE_URL ||
          "https://api.navoice.io",
        spec,
        mount: {
          micButton: "#navoice-mic",
          badge: "#navoice-badge",
          licenseBanner: "#navoice-license-banner",
        },
        navigation: {
          mode: "history",
          routes: {},
        },
      });

      await sdk.init();

      const navoice = sdk.navoice;
      const sdkOnResult = navoice.onResult;
      // Example route mapping — replace with your own screen IDs
      navoice.onResult = (result: any) => {
        sdkOnResult?.(result);

        if (result.kind === "execute") {
          switch (result.screenId) {
            case "guitar":
              router.push("/guitar");
              break;
            case "drums":
              router.push("/drums");
              break;
            case "recorder":
              router.push("/recorder");
              break;
            case "violin":
              router.push("/violin");
              break;
            default:
              console.log("No screen with id:", result.screenId, result.params);
          }
        }
      };
    }

    init();
  }, [router]);

  return null;
}
```

Optional: handle `present`, `showChoices`, and `unsupported` in the same callback after `sdkOnResult?.(result)`.

⸻

## Listening State

- The SDK binds `#navoice-mic` and drives **start / stop / processing** on click when `mount.micButton` is set. No extra `startVoice` / `stopVoice` calls are required for the default button.

| State       | Meaning                                              |
| ----------- | ---------------------------------------------------- |
| `idle`      | Ready; user can start a session.                     |
| `listening` | Recording; user can stop and send audio.             |
| `thinking`  | Pipeline in progress; clicks ignored until a result. |

The mic element gets `data-navoice-mic-state` (values above), set by the SDK:

```html
<button id="navoice-mic" type="button" data-navoice-mic-state="idle"></button>
```

⸻

## Required DOM Elements

Selectors must match `createNavoice` `mount`:

| ID                        | `mount` key             | Role                                     |
| ------------------------- | ----------------------- | ---------------------------------------- |
| `#navoice-mic`            | `micButton` (required)  | Mic control; SDK binds clicks and state. |
| `#navoice-badge`          | `badge` (optional)      | Success / fail feedback after results. |
| `#navoice-license-banner` | `licenseBanner` (optional) | Shown when license / domain check fails. |

⸻

## Protected Routes

On `execute`, resolve a path, then gate on auth: if the user is not signed in, store the pending path, `router.push("/signin")`, and after login `router.push(pending)` and clear it. Use the same `navoice.onResult` pattern as **Handling Results** (`const sdkOnResult = navoice.onResult` before you reassign).

```tsx
const sdkOnResult = navoice.onResult;

navoice.onResult = (result: any) => {
  sdkOnResult?.(result);
  if (result.kind === "execute") {
    const path = pathForScreen(result.screenId);
    if (!isAuthenticated()) {
      setPendingRoute(path);
      router.push("/signin");
      return;
    }
    router.push(path);
  }
};
```

`pathForScreen`, `isAuthenticated`, `setPendingRoute`, and `router` are yours to implement (same `router` as in the App Router example above).

⸻

## Environment Variables

| Variable                               | Purpose                    |
| -------------------------------------- | -------------------------- |
| `NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY`  | Project publishable key.   |
| `NEXT_PUBLIC_NAVOICE_BACKEND_BASE_URL` | API base (default shown).  |

⸻

## Speech-to-text (STT)

STT is configured via the SDK / backend (e.g. `sttConfig` on `createNavoice` when your bundle exposes it). Backend must expose `/api/stt` as documented for your deployment. Not required for the minimal install above if you rely on defaults.

⸻

## Integration Checklist

- [ ] `public/navoice.min.js` present
- [ ] `<Script src="/navoice.min.js" strategy="beforeInteractive" />` in root layout
- [ ] `public/spec.json` (or equivalent URL) loadable
- [ ] `.env.local` keys set; dev server restarted
- [ ] Portal **Allowed Identifiers** includes your origin
- [ ] `NavoiceShell` renders `#navoice-mic`, `#navoice-badge`, `#navoice-license-banner`
- [ ] `mount` in `createNavoice` matches those selectors
- [ ] `await sdk.init()` completes before using `navoice`
- [ ] `navoice.onResult` always calls `sdkOnResult?.(result)` first, then your routing (replace Quick Start `hash` with App Router `router.push` or equivalent before release)
- [ ] Verify console shows `[NAVOICE] mic clicked` logs during testing

⸻

## Support

**contact@navoice.io**
