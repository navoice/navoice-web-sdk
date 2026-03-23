# Navoice SDK -- Production Troubleshooting Guide

This document provides production-level troubleshooting guidance for Web integrations.

------------------------------------------------------------------------

## 🔐 License & Authentication Issues

### 1. License not active

**Symptom** - SDK shows banner: `License not active` - Navigation does
not execute

**Cause** - `projects.license_status` is not `trial` or `active`

**Resolution** - Verify Stripe subscription is active or trial started -

If you recently subscribed and still see ‘License not active’, contact support with your account email + timestamp + requestId from browser network tab.

------------------------------------------------------------------------

### 2. Invalid publishable_key

**Symptom** - Backend returns: `Invalid publishable_key`

**Resolution** - Use exact value from `projects.publishable_key` from the portal.

------------------------------------------------------------------------

### 3. Identifier is not allowed for this project

**Symptom** - Backend returns:
`Identifier is not allowed for this project`

**Cause** No matching row in `project_allowed_identifiers` for: -
`project_id` - `platform` - `identifier`

**Resolution** Add identifier in portal: - Web → `origin` (including protocol and port)

------------------------------------------------------------------------

## 🌐 Web-Specific Issues

### 4. origin is required for web binding

**Cause** SDK not sending `origin` field in `/api/license/validate`

**Required Payload**

```json
{
  "publishable_key": "YOUR_PUBLISHABLE_KEY",
  "platform": "web",
  "origin": "https://yourdomain.com"
}
```

Verify in Browser DevTools → Network → Request Payload

------------------------------------------------------------------------

## 📦 Web Bundle Integration Issues

### 5. SDK bundle not loaded

**Symptom**

- `window.NavoiceSDK` is undefined
- Voice button does nothing
- SDK initialization fails

**Cause**

- `navoice.min.js` was not copied to the public/static assets folder
- The script was not loaded in the application shell
- The script loaded too late

**Resolution**

- Copy `navoice.min.js` into your public/static assets folder
- Load it before application initialization

For Next.js App Router:

```tsx
import Script from "next/script";

<Script src="/navoice.min.js" strategy="beforeInteractive" />
```

- Verify in browser DevTools that `window.NavoiceSDK` exists

------------------------------------------------------------------------

## 🎤 STT Issues

### 6. STT fails

**Possible Causes** - Backend issue

If STT mode uses server transcription and you get STT errors, contact support.

------------------------------------------------------------------------

## 🧭 Navigation Issues

### 7. Voice works but no navigation

**Cause** - Missing route mapping - `navigate` callback not passed -
Spec does not contain matching task

**Checklist**

- `navoice.min.js` loads successfully
- `window.NavoiceSDK` exists
- `/spec.json` loads successfully
- `routes` contains all expected `screenId` values
- `navigate` is correctly wired

------------------------------------------------------------------------

## ✅ Production Validation Checklist

Before release, verify:

-   [ ] `navoice.min.js` is present in the public/static assets folder
-   [ ] SDK script is loaded before initialization
-   [ ] `window.NavoiceSDK` exists in the browser
-   [ ] `origin` registered in portal
-   [ ] publishable_key correct
-   [ ] license_status is trial or active
-   [ ] /api/license/validate returns JWT
-   [ ] Protected endpoints receive Bearer token
-   [ ] Spec loaded successfully
-   [ ] Routes match spec screenIds

------------------------------------------------------------------------

## 🏗 Architecture Overview

    App (Web)
        ↓
    Navoice SDK
        ↓
    POST /api/license/validate
        ↓
    License Gate (publishable_key + identifier + status)
        ↓
    JWT Minted
        ↓
    Protected APIs (/api/stt, /api/interpret)
        ↓
    Navigation Result
