# Navoice Web SDK

Official SDK for integrating Navoice voice navigation into web applications.  
Part of the **Navoice Voice Navigation Platform**.

Voice navigation SDK for modern web applications.

Navoice enables users to navigate your application using natural language voice commands such as:

- “Open events”
- “Go to education section”
- “Show taxes”

The SDK interprets user intent and returns navigation actions defined by your application’s navigation spec.

Navoice is production-ready, license-secured, and designed for enterprise-grade integrations.

---

## Key Capabilities

- Voice-driven navigation
- Local + cloud intent routing
- Secure license validation
- Built-in Speech-to-Text support
- Spec-based navigation architecture
- Compatible with modern frameworks (Next.js, React, Vue)

## Overview

Navoice Web SDK enables voice-driven navigation inside web applications.

Users can speak commands such as:

- “Open events”
- “Go to education section”
- “Show taxes”

The SDK interprets the intent and returns a navigation result defined in your application’s navigation spec.

## Architecture

```
Browser (Web App)
        │
        │ POST /api/license/validate
        ▼
Navoice Backend (License Validation)
        │
        │ JWT License Token
        ▼
Browser (SDK Active)
        │
        │ POST /api/interpret
        ▼
Navoice Backend (Intent Routing)
        │
        ▼
Navigation Result → Client Router

Optional flow:
Browser → /api/stt → Speech-to-Text
```

## Installation

1. Copy `navoice.min.js` into your app’s public/static assets folder  
   - Example: `public/navoice.min.js`
2. Load the SDK in your application shell.

For Next.js App Router:

```tsx
import Script from "next/script";

<Script src="/navoice.min.js" strategy="beforeInteractive" />
```

3. Access the SDK through the global object exposed by the bundle: `window.NavoiceSDK`

## Quick Start (3 Minutes)

1. Copy `navoice.min.js` into `public/`
2. Add your publishable key in environment variables (e.g. `NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY`)
3. Add your spec file to `public/spec.json`
4. Load the SDK script in your app layout (see **Installation**)
5. Initialize the SDK via `window.NavoiceSDK.createNavoice(...)`
6. Call `await sdk.init()` and start voice navigation (e.g. mic button wired to `startVoice` / `stopVoice` via `createNavoice` mount options)

The publishable key is generated in the Navoice Portal when you create a project.

## Basic Integration (Next.js Example)

1. Create an init file, e.g. `navoiceInit.ts`:

```ts
declare const NavoiceSDK: {
  createNavoice: (options: unknown) => { init: () => Promise<void>; navoice: { startVoice: () => void; stopVoice: () => void; route: (text: string) => Promise<unknown> } };
  NAVOICE_SDK_VERSION?: string;
  NavoiceSTTConfig?: { localOnly: unknown; cloudOnly: unknown; hybrid: unknown; disabled: unknown };
};

export async function initNavoice(navigate?: (path: string) => void) {
  const publishableKey = process.env.NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY ?? "";
  const sdkVersion =
    process.env.NEXT_PUBLIC_NAVOICE_SDK_VERSION ?? NavoiceSDK.NAVOICE_SDK_VERSION ?? "";

  const origin =
    typeof window !== "undefined" ? window.location.origin : undefined;

  const specRes = await fetch("/spec.json");
  const spec = await specRes.json();

  const sdk = NavoiceSDK.createNavoice({
    spec,
    publishableKey,
    sdkVersion,
    origin,
    sttConfig: NavoiceSDK.NavoiceSTTConfig?.localOnly,
    mount: {
      micButton: "#navoice-mic",
      badge: "#navoice-badge",
      licenseBanner: "#navoice-license-banner",
    },
    navigation: {
      mode: "history",
      navigate,
    },
  });

  await sdk.init();
}
```

2. Mount the SDK in your application (ensure `navoice.min.js` is loaded before `initNavoice` runs):

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initNavoice } from "@/navoiceInit";

export function NavoiceShell() {
  const router = useRouter();

  useEffect(() => {
    initNavoice((path) => router.push(path));
  }, [router]);

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

## Text Routing (No Mic)

You can route text directly without using the microphone:

```ts
await sdk.navoice.route("show my subscriber number");
```

A small wrapper (e.g. `routeNavoiceText()`) keeps the voice and text pipelines aligned.

## Result Model

The Web SDK returns a `NavoiceResult` object.

### Supported result kinds

- `execute`
- `present`
- `showChoices`
- `unsupported`

> **Note:** `present` is produced by local / semantic routing when a task defines `action.type === "present"`.  
> Backend response mapping currently produces `execute`, `showChoices`, or `unsupported`.

### Type shape

```ts
export type NavoiceResultBase =
  | {
      kind: "execute";
      screenId: string;
      params: Record<string, string>;
      say: string;
      confidence: number | null;
      taskId?: string;
      traceId?: string;
    }
  | {
      kind: "present";
      presentationId: string;
      params: Record<string, string>;
      say: string;
      confidence: number | null;
      taskId?: string;
      traceId?: string;
    }
  | {
      kind: "showChoices";
      say: string;
      choices: NavoiceChoice[];
      traceId?: string;
    }
  | {
      kind: "unsupported";
      say: string;
      traceId?: string;
    };

export type NavoiceResult = NavoiceResultBase & {
  sttUsed?: boolean;
  timings?: PipelineTimings;
};
```

```ts
export interface NavoiceChoice {
  taskId: string;
  title: string;
  confidence: number;
  screenId: string | null;
  params: Record<string, string> | null;
}
```

```ts
export interface PipelineTimings {
  stt?: number;
  normalize?: number;
  local?: number;
  semantic?: number;
  cloud?: number;
  total?: number;
}
```

### Result examples

**Execute**

```json
{
  "kind": "execute",
  "screenId": "events",
  "params": {},
  "say": "Opening events",
  "confidence": 0.92,
  "taskId": "events.open",
  "traceId": "trace_123"
}
```

**Present**

```json
{
  "kind": "present",
  "presentationId": "subscriber_number",
  "params": {},
  "say": "Showing your subscriber number",
  "confidence": 0.95,
  "taskId": "subscriber.number"
}
```

**Show choices**

```json
{
  "kind": "showChoices",
  "say": "I found multiple matches",
  "choices": [
    {
      "taskId": "events.today",
      "title": "Today's Events",
      "confidence": 0.81,
      "screenId": "events",
      "params": {}
    }
  ]
}
```

**Unsupported**

```json
{
  "kind": "unsupported",
  "say": "Sorry, I couldn't understand that request"
}
```

## Licensing Model

The SDK uses a publishable key + identifier binding model.

**License validation flow**

1. SDK sends `POST /api/license/validate` with:
   - `publishable_key`
   - `platform = web`
   - `origin`
   - `sdk_version`
2. Backend verifies license status, expiration, and domain binding.
3. Backend returns a short-lived JWT.
4. The SDK uses that token for `/api/interpret` and `/api/stt`.

## Domain Binding

Each application domain must be registered in the Navoice Portal.

Examples:

- `http://localhost:3000`
- `https://app.yourdomain.com`

If the domain is not registered, the SDK displays **License not active**.

## Security Model

**Principles**

- Publishable keys are safe for frontend usage.
- The backend issues signed JWTs.
- Tokens include `project_id`, `platform`, `identifier`, and expiration.

**Additional protections**

- Origin validation
- Short-lived tokens
- Backend license enforcement

## Production Deployment

Before going live:

1. Add the production domain to allowed identifiers.
2. Verify HTTPS.
3. Ensure license status is active.
4. Use the production publishable key.

## Error Handling

| Error                     | Meaning                          |
| ------------------------- | -------------------------------- |
| License not active        | License expired or disabled      |
| Identifier is not allowed | Domain not registered            |
| Missing Origin            | Browser request missing origin   |
| 401 Invalid token         | JWT expired or rejected          |

## STT Integration

If enabled, `/api/stt` converts audio into text using speech recognition.

**Backend requirements**

- ffmpeg installed
- OpenAI API key configured (on the Navoice backend)

## Logging and Debugging

Enable debug mode to see SDK logs. Typical log tags include STT transcription start/success and timing.

## Testing

Validate integration in your application: license banner behavior, mic trigger, routing results, and error handling in staging before production release.

## Demo Application

Example demo application: **Navoice-Web-MyCity** — demonstrates voice navigation, STT routing, result handling, and navigation integration.

## Platform Notes

**Web SDK supports**

- Next.js
- React
- Vue
- SPA routers

**Native SDKs** also exist for iOS and Android.

## Versioning

The SDK follows semantic versioning: `MAJOR.MINOR.PATCH`. Breaking changes increment `MAJOR`.

## Distribution Model

- Delivered as a compiled and minified browser bundle: **`navoice.min.js`**
- Source code is not distributed with the customer bundle
- The SDK is loaded as a browser script and exposed via **`window.NavoiceSDK`**

## Support

For support or integration help: **contact@navoice.io**

## Integration Checklist

Before shipping your application with Navoice, verify the following:

- `navoice.min.js` is in your public/static assets folder (e.g. `/public/navoice.min.js`)
- The SDK script is loaded in the application shell before initialization
- `NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY` (or equivalent) is configured
- Navigation spec is available (e.g. `/public/spec.json`)
- The SDK is initialized with `NavoiceSDK.createNavoice(...)` and `await sdk.init()`
- Voice trigger UI is connected (mic button or custom trigger via `createNavoice` `mount` options)
- `onResult` / navigation handling is wired for routing results

When these items are in place, your application is ready to use Navoice voice navigation.
