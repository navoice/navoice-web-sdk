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

## Overview

Navoice Web SDK enables voice-driven navigation inside web applications.

Users can speak commands such as:

- “Open events”
- “Go to education section”
- “Show taxes”

The SDK interprets the intent and returns a navigation result defined in your application’s navigation spec.

---

## Demo Setup

This demo app is provided as a reference implementation.

Voice navigation is disabled by default until you provide your own publishable key and register your domain.

### 1. Create a local environment file

Create a local `.env.local` file:

```env
NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_NAVOICE_BACKEND_BASE_URL=https://api.navoice.io

```

You can copy from:

```bash
cp .env.example .env.local
```

Then restart the development server:

```bash
npm run dev
```

### 2. Register Your Domain (Required)

To activate voice navigation, you must register your application’s URL in the Navoice Portal.

1. Go to the Navoice Portal
2. Open your project
3. Navigate to Allowed Identifiers
4. Add your application URL, for example:

```
http://localhost:3000
https://yourdomain.com
```

## Key Capabilities

- Voice-driven navigation
- Local + cloud intent routing
- Secure license validation
- Built-in Speech-to-Text support
- Spec-based navigation architecture
- Compatible with modern frameworks (Next.js, React, Vue)

## Architecture

```text
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

**Step 1 — Copy SDK**

Copy `navoice.min.js` into `public/`

⸻

**Step 2 — Load SDK Script**

```tsx
import Script from "next/script";

<Script src="/navoice.min.js" strategy="beforeInteractive" />
```

**Step 3 — Add Spec**

Place your spec file in `/public/spec.json`
(or any publicly accessible URL)

**Step 4 — Initialize Navoice**

```ts
"use client";

async function init() {
  const specRes = await fetch("/spec.json");
  const spec = await specRes.json();

  if (!window.NavoiceSDK) {
    throw new Error("Navoice SDK not loaded");
  }

  const sdk = window.NavoiceSDK.createNavoice({
    publishableKey: process.env.NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY,
    backendBaseUrl:
      process.env.NEXT_PUBLIC_NAVOICE_BACKEND_BASE_URL ||
      "https://api.navoice.io",
    spec,
    mount: {
      micButton: "#navoice-mic",
    },
    navigation: {
      mode: "history",
      routes: {},
    },
  });

  await sdk.init();

  const navoice = sdk.navoice;

  navoice.onResult = (result) => {
    if (result.kind === "execute") {
      window.location.hash = `#/${result.screenId}`;
    }
  };
}

init();
```

## Required Parameters

The following parameters are required for proper SDK operation:

- **publishableKey** — Your project publishable key
- **backendBaseUrl** — Navoice backend URL
- **spec** — Navigation spec JSON

Example:

```ts
const sdk = window.NavoiceSDK.createNavoice({
  publishableKey,
  backendBaseUrl: "https://api.navoice.io",
  spec,
});
```

## Built-in Microphone State and Automatic Navigation

`createNavoice` is the high-level integration path: it constructs a `Navoice` client, **binds the mic control** from `mount.micButton` during `init()`, and installs a default **`navoice.onResult`** handler that updates **mic state**, **badge** feedback, and (unless you opt out) **automatic navigation**.

- **Mic:** The SDK owns the listening lifecycle for the mounted control—state transitions and calls to `startVoice` / `stopVoice` on user interaction.
- **Results:** The factory’s `onResult` resets the mic, updates the badge when configured, and optionally navigates based on `navigationMode`.

### Mic listening states

The SDK tracks three states and mirrors them on the mic element as **`data-navoice-mic-state`**:

| State | Meaning |
| ----- | ------- |
| `idle` | Ready; user can start a session. |
| `listening` | Recording; user can stop and send audio for processing. |
| `thinking` | Waiting for STT / interpret / result; clicks are ignored until a result arrives. |

Example markup (the attribute is set and updated by the SDK):

```html
<button id="navoice-mic" type="button" data-navoice-mic-state="idle"></button>
```

**Transitions (click on the mounted mic element)**

- **`idle` → `listening`** — SDK calls `startVoice()`.
- **`listening` → `thinking`** — SDK calls `stopVoice()` to finalize capture and run the pipeline.
- **`thinking` → `idle`** — When a `NavoiceResult` is delivered, the factory’s `onResult` handler sets the mic back to `idle` (no click in this phase).

While in **`thinking`**, additional clicks do nothing until the result callback runs.

## Required DOM Elements

Provide elements in the DOM that match the selectors you pass in `createNavoice`’s `mount` option. Typical IDs:

```html
<button id="navoice-mic" type="button"></button>
<span id="navoice-badge"></span>
<div id="navoice-license-banner"></div>
```

Mount options:

```ts
mount: {
  micButton: "#navoice-mic",
  badge: "#navoice-badge",
  licenseBanner: "#navoice-license-banner",
},
```

| Element | Selector option | Role |
| ------- | --------------- | ---- |
| Mic button | `micButton` (**required** in `mount`) | Voice toggle: the SDK binds click handling in `init()` and updates `data-navoice-mic-state`. |
| Badge | `badge` (optional) | Short success/failure feedback via `data-navoice-badge` (`success` / `fail`) after each result. |
| License banner | `licenseBanner` (optional) | Shown when web license validation fails (e.g. inactive license or disallowed domain); hidden when validation succeeds or when using local-only STT where validation is skipped in `init`. |

You may use different IDs as long as the CSS selectors in `mount` match your markup.

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
    backendBaseUrl:
  process.env.NEXT_PUBLIC_NAVOICE_BACKEND_BASE_URL || "https://api.navoice.io",
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
      routes: {},
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

## Navigation Responsibility


Navoice is routing-agnostic.

The SDK does not assume any router implementation.
You may use:

- Next.js Router
- React Router
- Vue Router
- Custom navigation logic

The SDK returns a `NavoiceResult` (see **Result Model**), and the host application is responsible for:

- Navigation
- Protected route handling
- Authentication checks
- UI transitions

When using `createNavoice`, automatic history navigation is optional and controlled by `navigationMode` (see below). Even in automatic mode, the host still owns the router function, route map, and all auth and guard logic around it.

Example (host handles routing from results — map `screenId` / `presentationId` to URLs the same way as your `navigation.routes` table):

```ts
navoice.onResult = (result) => {
  switch (result.kind) {
    case "execute":
      router.push(pathForScreen(result.screenId));
      break;
    case "present":
      showModal(result.presentationId);
      break;
  }
};
```

If you integrate via `createNavoice`, its default `onResult` also drives mic state and badges. Use `navigationMode: 'manual'` and chain that handler as shown under **Host-Controlled Navigation** so those behaviors are preserved.

### Automatic Navigation vs Host-Controlled Navigation

Navoice supports two navigation patterns via `createNavoice` options:

#### Host-Controlled Navigation (Recommended)

Set `navigationMode: 'manual'` so the SDK does not call `navigation.navigate` for `execute` / `present`. Handle each result in `navoice.onResult`. To keep built-in mic state and badge behavior from `createNavoice`, chain the handler the factory installed:

```ts
const { navoice, init } = NavoiceSDK.createNavoice({
  /* ... */,
  navigation: {
    mode: "history",
    routes: { events: "/events" /* ... */ },
    navigate: (path) => router.push(path),
  },
  navigationMode: "manual",
});

const sdkOnResult = navoice.onResult;
navoice.onResult = (result) => {
  sdkOnResult?.(result);
  if (result.kind === "execute") {
    router.push(/* path from result.screenId + routes */);
  }
};
```

This allows:

- Auth checks
- Analytics
- Permission handling
- Custom transitions

#### Automatic Navigation (Optional Pattern)

`navigationMode` defaults to **`'auto'`**. In that mode, `createNavoice` assigns `navoice.onResult` so that after every result the mic returns to **`idle`**, the badge updates when `mount.badge` is set, and navigation runs only for the cases below (implementation matches `createNavoice.ts`).

When **`navigationMode: 'auto'`**, the SDK **automatically**:

- **Navigates on `execute`** — resolves a path from `navigation.routes` using `screenId` and optional query string from `params`, then calls `navigation.navigate` or `history.pushState`.
- **Navigates on `present`** — same pattern using `presentationId` as the route key.
- **Does not navigate on `showChoices`** — shows badge feedback only; disambiguation UI stays with the host.
- **Does not navigate on `unsupported`** — shows badge feedback only.

The host still supplies `navigation.routes` and `navigation.navigate` (or relies on `history` when `navigate` is omitted), so the route table and URL shape remain app-defined; the SDK only applies the mapping automatically after each result.

With **`navigationMode: 'manual'`**, that same `onResult` still updates mic state and badges, but it **does not** call `navigateTo` for **`execute`** or **`present`**—the host must perform navigation (or other UI) in a chained handler (see above).

## SDK vs Host Responsibilities

**The SDK (`createNavoice` + `Navoice`) typically handles**

- Voice capture and the mic button binding (when `mount.micButton` is used)
- Speech-to-text (per your `sttConfig`) and interpretation against the spec
- Intent routing and emitting `NavoiceResult` values
- Mic listening state (`data-navoice-mic-state`) on the mounted control
- Badge feedback when `mount.badge` is configured
- Optional **automatic** navigation for **`execute`** / **`present`** when `navigationMode: 'auto'`

**The host application typically handles**

- Supplying the router function and route map (`navigation.navigate`, `navigation.routes`)
- Authentication, authorization, and protected-route policy
- UI transitions, layout, and any navigation the SDK does not perform (e.g. after **`showChoices`** or **`unsupported`**)
- Modals, sheets, or inline UI for **`present`** when you do not map `presentationId` to a URL—or when using **`manual`** mode for full control
- Choice pickers or follow-up flows for **`showChoices`**

Lower-level use of `Navoice` without `createNavoice` is still possible: the host then wires the mic, badges, license UI, and all navigation itself.

## Protected Routes Integration

If navigation targets a protected route, the host app should:

1. Detect protected route
2. Store pending destination
3. Redirect to sign-in
4. After login, navigate to destination

Example (after mapping `screenId` to a path):

```ts
navoice.onResult = (result) => {
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

### Resume Navigation After Login

Example pattern:

```ts
useEffect(() => {
  const pending = getPendingRoute();
  if (isAuthenticated() && pending) {
    router.push(pending);
    clearPendingRoute();
  }
}, [isAuthenticated]);
```

### Integration Pattern

Common integration pattern:

Voice → Navoice → Result → Auth Check → Navigate

Architecture:

```text
App UI
│
▼
Navoice SDK
│
▼
Result (execute / present / showChoices / unsupported)
│
▼
Host App Logic
│
├── Auth Check
├── Analytics
├── Permissions
▼
Router Navigation
```

### Host App Responsibilities

For a concise split between factory defaults and app-owned behavior, see **SDK vs Host Responsibilities**.

The host application is responsible for:

- Routing
- Authentication
- Protected routes
- Navigation animations
- UI components
- Modal rendering
- Choice UI

The SDK is responsible for:

- Voice processing
- Intent detection
- Routing resolution
- Result generation

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
- `publishableKey` is configured (e.g. `NEXT_PUBLIC_NAVOICE_PUBLISHABLE_KEY`)
- `backendBaseUrl` is configured
- `spec` is loaded manually using `fetch` (or equivalent) before `createNavoice`
- `await sdk.init()` completes before you use `sdk.navoice` or rely on mic binding
- `mount.micButton` points at a real DOM node so `init()` can bind the mic automatically (or you use a custom trigger and call `navoice.startVoice` / `stopVoice` yourself)
- For **`navigationMode: 'manual'`** (or custom `Navoice` usage), `onResult` / navigation handling is wired for routing results; for **`'auto'`**, ensure `navigation.routes` covers your `screenId` / `presentationId` values

When these items are in place, your application is ready to use Navoice voice navigation.
