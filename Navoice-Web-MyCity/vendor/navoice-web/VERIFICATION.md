# Web SDK Parity — Manual Verification Checklist

## Log prefixes (structured)

- `[Navoice][Normalize]` — raw input, normalized output, stopwords count/source
- `[Navoice][LocalFirst]` — LocalRouter score, confidence, decision (execute | choices | fallback)
- `[Navoice][SpecContext]` — candidates list, per-candidate try, relatedBoost, boosts applied
- `[Navoice][STT]` — locale, transcript (voice path only)
- `[Navoice][Semantic]` — entering, cache hit/miss, match list, topTask/score, decision (promote | reject)

---

## Manual test cases

### 1. "Take me to school page"

- **Input:** `Take me to school page` (or a non-English equivalent in your spec’s locale, e.g. a localized phrase for “take me to the school page” if the spec includes it)
- **Expected:** Strong local match if spec has a task with keyword "school" (or localized equivalents) and examples or title containing that.
- **Expected log flow:**
  1. `[Navoice][Normalize] raw="Take me to school page"`
  2. `[Navoice][Normalize] normalized="take me school page"` (or similar after stopwords)
  3. `[Navoice][Normalize] stopwords count=N source=...`
  4. `[Navoice][LocalFirst] RuntimeSpec decode OK – trying local router` (or SpecContext candidates if context enabled)
  5. `[Navoice][LocalFirst] score=X conf=Y decision=execute`
- **Expected final decision:** `execute` with the school-related screenId/taskId.

---

### 2. "Is there a concerts today?"

- **Input:** `Is there a concerts today?`
- **Expected:** Local or semantic match to a "concerts" / events task if spec has it; otherwise cloud or unsupported.
- **Expected log flow:**
  1. `[Navoice][Normalize] raw="Is there a concerts today?"`
  2. `[Navoice][Normalize] normalized="..."` (stopwords may remove "is", "there", "a" if in spec)
  3. Either LocalFirst decision=execute/choices, or fallback then:
  4. `[Navoice][Semantic] entering ...`
  5. Either `[Navoice][Semantic] topTask=... decision=promote` or `decision=reject` then cloud.
- **Expected final decision:** execute (local or semantic) or showChoices or cloud execute.

---

### 3. Non-English locale cases

- **Input (e.g.):** Use phrases in your app’s default or configured locale (e.g. home-page navigation and “show me concerts” equivalents).
- **Expected:** Same pipeline: Normalize (locale-appropriate casing; stopwords from `stopwordsByLocale[<locale>]` or `routing.stopwords`), then LocalRouter, then optional SpecContext, then optional Semantic, then cloud.
- **Expected log flow:**
  1. `[Navoice][Normalize] raw="..."`  `normalized="..."`  `stopwords count=N source=stopwordsByLocale[<locale>]` or `routing.stopwords`
  2. `[Navoice][LocalFirst] ... decision=...`
  3. If unsupported/weak: `[Navoice][Semantic] entering ...` then promote or reject.
- **Expected final decision:** execute / present / showChoices / unsupported consistent with spec and thresholds.

---

### 4. Strong local match

- **Input:** Exact or near-exact phrase from a task’s keywords or examples (e.g. "open settings" when task has keyword "settings").
- **Expected:** LocalRouter returns execute without cloud or semantic.
- **Expected log flow:**
  1. Normalize logs
  2. `[Navoice][LocalFirst] score=X conf=Y decision=execute` (X ≥ execute_min_score, Y ≥ execute_min_conf)
  3. No `[Navoice][Semantic] entering`, no "Falling back to cloud interpret".
- **Expected final decision:** execute (or present) from local.

---

### 5. Weak match requiring semantic

- **Input:** Paraphrase or synonym that does not score above execute threshold locally (e.g. "show me the events" when task title is "Concerts").
- **Expected:** LocalRouter returns unsupported or showChoices; Semantic runs; if semantic confidence ≥ semantic_min_conf, promote to execute.
- **Expected log flow:**
  1. Normalize logs
  2. `[Navoice][LocalFirst] ... decision=fallback` (or choices)
  3. `[Navoice][Semantic] entering ...`
  4. `[Navoice][Semantic] cache miss – will call resolve` or `cache hit ...`
  5. `[Navoice][Semantic] match taskId=... confidence=...`
  6. `[Navoice][Semantic] topTask=... score=... decision=promote`
- **Expected final decision:** execute (or present) from semantic with the matched taskId.

---

### 6. Unsupported case

- **Input:** Text that matches no task (e.g. "what’s the weather tomorrow" with no weather task).
- **Expected:** LocalRouter unsupported; Semantic may run and not promote (or no match); then cloud interpret; final result may be unsupported or cloud-driven.
- **Expected log flow:**
  1. Normalize logs
  2. `[Navoice][LocalFirst] ... decision=fallback`
  3. `[Navoice][Semantic] entering ...` then either `decision=reject` or no match above threshold
  4. `[Navoice][LocalFirst] Falling back to cloud interpret`
- **Expected final decision:** unsupported or cloud execute/show_choices depending on backend.

---

## Verification checklist (summary)

- [ ] **Step 2 – Normalization:** Every route() logs `[Navoice][Normalize] raw=`, `normalized=`, `stopwords count=N source=...`. Both typed and voice paths use the same normalized text (voice path: transcript → route() → same normalize inside).
- [ ] **Step 1 – LocalRouter:** LocalRouter runs before cloud; logs `[Navoice][LocalFirst] score=X conf=Y decision=execute|choices|fallback`. If decision=execute, no cloud call.
- [ ] **Step 3 – Spec Context:** When spec has routing.context.enabled, logs `[Navoice][SpecContext] candidates=...` and per-candidate try and `boosts applied=...`. Best candidate wins by effective confidence; no mutation of original spec.
- [ ] **Step 0 – STT:** Voice path logs `[Navoice][STT] locale=...` and `[Navoice][STT] transcript="..."`. Post-ASR replacements applied in route() when spec provides stt.replacementsByLocale[locale].
- [ ] **Step 3.5 – Semantic:** Semantic runs only when local did not pass; logs `[Navoice][Semantic] entering`, then cache hit/miss, match list, `topTask=... decision=promote|reject`. Uses POST /api/semantic/resolve; per-session cache; timeout safety; does not run on every request.
- [ ] **Cloud fallback:** Cloud interpret receives normalized text; used only after local and (if enabled) semantic have been tried.
- [ ] **API surface:** No breaking changes; execute/present include optional taskId; present kind added for parity.

---

## Expected log flow sequence (generic)

1. `[Navoice][Normalize] raw="<input>"`  
2. `[Navoice][Normalize] normalized="<normalized>"`  
3. `[Navoice][Normalize] stopwords count=N source=<source>`  
4. If context enabled: `[Navoice][SpecContext] candidates=...` and per-candidate lines and `boosts applied=...`  
5. Else: `[Navoice][LocalFirst] RuntimeSpec decode OK – trying local router`  
6. `[Navoice][LocalFirst] score=X conf=Y decision=<execute|choices|fallback>`  
7. If fallback and semantic enabled: `[Navoice][Semantic] entering ...` then cache/matches and `decision=promote|reject`  
8. If still no result: `[Navoice][LocalFirst] Falling back to cloud interpret`  
9. Final result: execute | present | showChoices | unsupported

Voice-only addition: before step 1, for the transcript used as input:
- `[Navoice][STT] locale=...`
- `[Navoice][STT] transcript="..."`
