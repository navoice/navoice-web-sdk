# Web SDK parity verification – MUST-HAVEs (steps 0–3.5)

## 1) Same normalizedText for LocalRouter, SemanticResolver, and Cloud interpret

**Requirement:** The exact same `normalizedText` is used for LocalRouter, SemanticResolver, and cloud interpret. No branch may use raw text after normalization.

**Evidence:**

| Consumer | File | Line(s) | What is passed |
|----------|------|--------|----------------|
| Normalize input | `Navoice.ts` | 261–262 | `textForPipeline` (post-ASR if any) → `normalize(textForPipeline, ...)` → `norm` |
| LocalRouter (no context) | `Navoice.ts` | 337 | `routeLocal(norm.normalizedText, fullSpec, thresholds)` |
| SpecContext expand base | `Navoice.ts` | 283 | `expand(norm.normalizedText, ...)` → candidates derived from same base |
| LocalRouter (per candidate) | `Navoice.ts` | 294 | `routeLocal(candidate.text, ...)` where `candidate.text` is expansion of `norm.normalizedText` |
| SemanticResolver | `Navoice.ts` | 368–376 | `SemanticCache.key(norm.normalizedText, ...)` and `resolveSemantic(norm.normalizedText, ...)` |
| Cloud interpret | `Navoice.ts` | 441 | `this.client.interpret(this.locale, norm.normalizedText, this.spec, token)` |

- Raw `clean` is only used: (1) as input to post-ASR when spec has replacements, (2) in logs as `raw="${clean}"`. No routing branch uses `clean` after `norm` is computed.
- **Conclusion:** MUST-HAVE 1 satisfied.

---

## 2) "Present" action respected in ALL paths

**Requirement:** `action.type === 'present'` is handled consistently in LocalRouter result, Semantic promote, and cloud post-processing (match taskId/screenId back to spec `task.action`).

**Evidence:**

| Path | File | Line(s) | Behavior |
|------|------|--------|----------|
| LocalRouter final result | `LocalRouter.ts` | 140–152 | If `act?.type === 'present'` and `(act.id ?? '').trim()` non-empty → return `kind: 'present'` with `presentationId: act.id.trim()`, `taskId: top.task.id`. |
| Semantic promote | `Navoice.ts` | 389–406 | If `task.action?.type === 'present'` and `act?.id?.trim()` → return `kind: 'present'` with `presentationId: act.id.trim()`, `taskId: task.id`. Else use `screenId` from `act?.screenId` or `task.screenId` for execute. |
| Cloud post-processing | `Navoice.ts` | 448–468 | Resolve `task` by `cloudTaskId` or `cloudScreenId`; if `task?.action?.type === 'present'` and `task.action.id?.trim()` → return `kind: 'present'` with `presentationId: task.action.id.trim()`. Else return execute with `screenId` from `task?.action?.screenId` or `task?.screenId` or `cloudScreenId`. |

- **Conclusion:** MUST-HAVE 2 satisfied.

---

## 3) Post-ASR replacements before normalization for BOTH voice and typed text

**Requirement:** Post-ASR replacements run before normalization for both voice transcript and typed text, so the pipeline is identical (same `textForPipeline` logic).

**Evidence:**

| Step | File | Line(s) | Behavior |
|------|------|--------|----------|
| Single entry for both | `Navoice.ts` | 244–260 | `route(text)` is the only entry: typed text is `route(typed)`; voice path calls `routeAndCallback(raw)` (e.g. 533) which calls `route(raw)`. So both go through the same `route()` body. |
| Post-ASR then normalize | `Navoice.ts` | 251–262 | `textForPipeline = clean` or `applyPostASRReplacements(clean, ...)` when spec has `stt.replacementsByLocale[locale]`. Then `norm = normalize(textForPipeline, ...)`. No branch skips post-ASR for one input type. |
| Voice path | `Navoice.ts` | 521–533 | Transcript `raw` is passed to `routeAndCallback(raw)` → `route(raw)`. No separate pipeline; same `textForPipeline` and normalize as typed. |

- Optional log when replacements were applied: `Navoice.ts` 249–252 – if `textForPipeline !== clean`, log `[Navoice][Normalize] postASR applied pipelineInput="..."`.
- **Conclusion:** MUST-HAVE 3 satisfied.

---

## Logs added for correctness

- **Normalize:**  
  - `[Navoice][Normalize] raw="..."` (original trimmed input)  
  - `[Navoice][Normalize] normalized="..."`  
  - When post-ASR was applied: `[Navoice][Normalize] postASR applied pipelineInput="..."`

- **Route result (every return):**  
  - `[Navoice][Route] source=<local|semantic|cloud|normalize|license> result=<execute|present|showChoices|unsupported> taskId=<id|-> target=<screenId|presentationId|->`

Locations: `Navoice.ts` – helper `logRouteResult` and calls before every `return` of a route result (normalize empty, local SpecContext, local single, license error, semantic present/execute, cloud execute/showChoices/unsupported).
