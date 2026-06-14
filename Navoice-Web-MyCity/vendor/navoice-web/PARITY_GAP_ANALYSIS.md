# Web SDK vs iOS SDK — Parity Gap Analysis (Steps 0–3.5)

## Summary

| Step | iOS behavior summary | Web current behavior | Status | Required changes |
|------|----------------------|----------------------|--------|------------------|
| **0** | STT: locale from Spec; contextualStrings/hints from Spec; prompts per locale; post-ASR replacements; transcript flows into same normalize() | Web: STT uses only constructor `locale`; no spec-driven hints/prompts; cloud STT has no STT params from spec; no post-ASR replacements; transcript not passed through replacements or normalize before route | **MISSING** | If Web owns transcript: apply post-ASR replacements from spec, then same normalize path. Document that Web Speech API does not accept hints; for cloud STT fallback, pass spec-driven params (language, prompt, hints) to backend. Add logs: `[Navoice][STT] locale=… transcript="…"`. |
| **1** | LocalRouter runs **before** any cloud interpret; uses thresholds from runtime Spec (execute_min_score, execute_min_conf, etc.); if confident → return execute/present; if not → showChoices or continue to semantic/cloud | Web: No local router. `route(text)` trims and calls `client.interpret()` directly (always cloud). | **MISSING** | Implement LocalRouter; run it on normalized text before cloud; use thresholds from decoded spec; if execute/present → return; if showChoices → return; if unsupported → continue. Add log: `[Navoice][LocalFirst] score=X conf=Y decision=execute|choices|fallback`. |
| **2** | Normalization in main path: trim, collapse spaces, en-* lowercase, strip trailing punctuation, stopwords with priority `stopwordsByLocale[locale]` → `routing.stopwords` → `[]`. Both local and cloud paths use same normalizedText. | Web: Only `text.trim()` in `route()`; no normalize(), no stopwords, no punctuation cleanup, no locale-based lowercasing. | **MISSING** | Implement `normalize(text, locale, stopwords)` with same rules; resolve stopwords from spec (stopwordsByLocale → routing.stopwords → []); use normalized text for both local and cloud. Add logs: `[Navoice][Normalize] raw="…"`, `normalized="…"`, `stopwords count=N source=…`. |
| **3** | Spec Context: synonyms expansion, related intents boost, session memory boost; apply boosts **before** scoring; expand candidates (original + synonym + memory); run LocalRouter per candidate; pick best by effective confidence; do not mutate original spec. | Web: No spec context; no synonyms, no related intents, no session memory. | **MISSING** | Implement SpecContext expand (synonyms, memory follow-up, plural); run LocalRouter per candidate; apply relatedBoost from context.memory; apply boosts before comparing; do not mutate spec. Add logs: `[Navoice][SpecContext] candidates=…`, `boosts applied=…`. |
| **3.5** | Conditional Semantic Resolver: only when LocalRouter returns unsupported or weak; call Voice Gateway **embeddings** endpoint (`/api/semantic/resolve`), NOT full `/api/interpret`; returns topTaskId + semanticScore/confidence; if passes threshold → promote and return; per-session cache; never runs on every call. | Web: No semantic resolver; no cache; always falls back to full cloud interpret. | **MISSING** | Implement conditional semantic: only when local did not pass; call `POST /api/semantic/resolve` with normalizedText, task descriptors; cache by (text, locale) with TTL; if best.confidence >= semantic_min_conf → promote to execute/present and return; timeout safety. Add logs: `[Navoice][Semantic] entering`, `topTask=… score=…`, `decision=promote|reject`. |

---

## Per-step detail

### Step 0 — STT Optimization

- **iOS location:** `Navoice.swift`: `buildSTTParams(locale:)`, `applyPostASRReplacements(_:replacements:maxReplacements:)`; used in `route(text:)` for post-ASR on typed/voice text and in `stopVoice()` for cloud STT params.
- **Web location:** `Navoice.ts` `route()`, `stopVoice()`; `WebSpeechSTT.ts` (locale only); `CloudSTTProvider.ts` (no spec params).
- **Differences:** iOS uses spec.stt.languageByLocale, promptsByLocale, hintsByLocale, replacementsByLocale; Web uses none. Transcript on Web is not run through replacements or a single normalize path before routing.
- **Required:** Apply post-ASR replacements when spec provides them (before normalize). For cloud STT, build and send spec-driven STT params if backend supports them. Add `[Navoice][STT] locale=… transcript="…"` (and optionally replacements applied).

### Step 1 — LocalRouter before cloud

- **iOS location:** `LocalRouter.swift` `route(text:spec:thresholds:)`; `Navoice.swift` calls it after normalize, with `decodedSpec` and `thresholds` from spec.
- **Web location:** None.
- **Differences:** Web has no local scoring; every request hits cloud.
- **Required:** Add LocalRouter module; decode spec to get thresholds; run LocalRouter on normalized text first; return immediately on execute/present/showChoices; only on unsupported (or weak) continue to semantic then cloud. Use same threshold names and default values as iOS.

### Step 2 — Normalization

- **iOS location:** `Normalizer.swift` `normalize(_:locale:stopwords:)`; `Navoice.swift` resolves stopwords (stopwordsByLocale[locale] → routing.stopwords → []), then calls Normalizer; both local and cloud use `norm.normalizedText`.
- **Web location:** Only `text.trim()` in `Navoice.ts` `route()`.
- **Differences:** No collapse spaces, no en-* lowercasing, no trailing punctuation strip, no stopwords, no single normalized string for pipeline.
- **Required:** Implement Normalizer with identical logic (trim, collapse spaces, en-* lowercase, strip trailing punctuation, remove stopwords). Resolve stopwords from decoded spec with same priority. Use normalized text for LocalRouter and for cloud interpret. Add structured logs.

### Step 3 — Spec Context

- **iOS location:** `SpecContext.swift` `SpecContextEngine.expand(text:locale:spec:memory:)`; `Navoice.swift` when `routing.context.enabled` runs expand, then LocalRouter per candidate, applies relatedIntents boost, picks best.
- **Web location:** None.
- **Differences:** No candidate expansion, no synonyms, no session memory, no related-intent boost.
- **Required:** Implement expand (original, synonyms, plural, memory follow-up); session memory; run LocalRouter per candidate; apply relatedBoost when last result taskId is in relatedIntents; pick best by effective confidence; do not mutate spec. Add logs for candidates and boosts.

### Step 3.5 — Semantic Resolver

- **iOS location:** `SemanticResolver.swift` `resolve(text:locale:spec:topK:preferLocales:client:bearerToken:)`; `SemanticCache.swift`; `NavoiceClient.swift` `resolveSemantic(...)`; `Navoice.swift` only when local did not pass, then cache get/set, then if best >= semantic_min_conf promote.
- **Web location:** None; no semantic endpoint, no cache.
- **Differences:** Web always uses full `/api/interpret` when local is not used.
- **Required:** Add `resolveSemantic` to NavoiceClient (POST /api/semantic/resolve); SemanticCache (key = text|locale, TTL from spec); run only when local result is unsupported (or weak); build task descriptors from spec (title, keywords, examples, locale-aware); if best match >= semantic_min_conf, promote to execute/present and return; timeout and no-mutation guarantees. Add logs: entering, topTask, decision.

---

## Execution order (both SDKs)

1. **Normalize** (Step 2): one normalized string for the rest of the pipeline.
2. **Spec Context** (Step 3): expand candidates, then for each candidate:
3. **LocalRouter** (Step 1): score and threshold; if execute/present/showChoices → return.
4. **Semantic** (Step 3.5): only if local did not pass; resolve; promote or continue.
5. **Cloud interpret**: send normalized text to `/api/interpret`.

STT (Step 0) applies to the **input** (voice/typed) before it becomes the text that is normalized (e.g. post-ASR replacements), so it is “before” the pipeline; the pipeline itself uses the same normalize path for both typed and voice.

---

## Parity matrix (concise)

| Step | iOS behavior summary | Web current behavior | Status | Required changes |
|------|----------------------|----------------------|--------|------------------|
| 0 | Locale + hints + prompts + replacements from spec; transcript → normalize | Locale only; no hints/replacements; transcript not through spec or normalize | **MISSING** | Post-ASR replacements; spec STT params for cloud; logs |
| 1 | LocalRouter first; thresholds from spec; execute/choices/unsupported | No local router; always cloud | **MISSING** | LocalRouter; run before cloud; thresholds; logs |
| 2 | normalize(); stopwords priority; same text for local + cloud | trim() only | **MISSING** | normalize(); stopwords; logs |
| 3 | Synonyms, related intents, session memory; boosts before scoring | None | **MISSING** | SpecContext expand; session memory; relatedBoost; logs |
| 3.5 | Conditional semantic resolve; /api/semantic/resolve; cache; promote if above threshold | None | **MISSING** | resolveSemantic; cache; conditional; logs |

No step is FULL or PARTIAL; all are MISSING on Web. Implementation order: **2 → 1 → 3 → 0 → 3.5**.
