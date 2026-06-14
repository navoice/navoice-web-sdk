/**
 * SemanticResolver – parity with iOS Step 3.5.
 * Calls POST /api/semantic/resolve (Voice Gateway embeddings), NOT full /api/interpret.
 * Used only when LocalRouter returns unsupported or weak.
 */

import type { RuntimeSpec, RuntimeSpecTask } from './runtimeSpec';
import type { SemanticMatch } from './SemanticCache';
import type { ResolveSemanticParams } from './NavoiceClient';

export type SemanticTaskDescriptor = ResolveSemanticParams['tasks'][number];

function cleanAndDedupe(strings: string[]): string[] {
  const trimmed = strings.map((s) => s.trim()).filter(Boolean);
  return [...new Set(trimmed)];
}

function keywordsForTask(
  task: RuntimeSpecTask,
  effectiveLocale: string,
  defaultLocale: string,
  preferLocales: boolean
): string[] {
  if (preferLocales) {
    const fromEffective = task.keywordsByLocale?.[effectiveLocale] ?? [];
    const fromDefault = task.keywordsByLocale?.[defaultLocale] ?? [];
    const fromLegacy = task.keywords ?? [];
    const combined = fromEffective.length > 0 ? fromEffective : fromDefault.length > 0 ? fromDefault : fromLegacy;
    return cleanAndDedupe(combined);
  }
  let all = task.keywords ?? [];
  if (task.keywordsByLocale) {
    for (const arr of Object.values(task.keywordsByLocale)) all = all.concat(arr);
  }
  return cleanAndDedupe(all);
}

function examplesForTask(
  task: RuntimeSpecTask,
  effectiveLocale: string,
  defaultLocale: string,
  preferLocales: boolean
): string[] {
  if (preferLocales) {
    const fromEffective = task.examplesByLocale?.[effectiveLocale] ?? [];
    const fromDefault = task.examplesByLocale?.[defaultLocale] ?? [];
    const fromLegacy = task.examples ?? [];
    const combined = fromEffective.length > 0 ? fromEffective : fromDefault.length > 0 ? fromDefault : fromLegacy;
    return cleanAndDedupe(combined);
  }
  let all = task.examples ?? [];
  if (task.examplesByLocale) {
    for (const arr of Object.values(task.examplesByLocale)) all = all.concat(arr);
  }
  return cleanAndDedupe(all);
}

const SEMANTIC_RESOLVE_TIMEOUT_MS = 8000;

/**
 * Resolve semantic matches via POST /api/semantic/resolve. Never blocks forever; has timeout.
 */
export async function resolveSemantic(
  text: string,
  locale: string,
  spec: RuntimeSpec,
  topK: number,
  preferLocales: boolean,
  client: { resolveSemantic: (params: ResolveSemanticParams, traceId?: string) => Promise<{ matches: SemanticMatch[] }> },
  bearerToken: string,
  traceId?: string
): Promise<SemanticMatch[]> {
  const effectiveLocale = locale?.trim() ? locale : spec.app.default_locale;
  const defaultLocale = spec.app.default_locale;
  const tasks: ResolveSemanticParams['tasks'] = (spec.tasksRaw ?? spec.tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    screenId: t.screenId,
    keywords: keywordsForTask(t, effectiveLocale, defaultLocale, preferLocales),
    examples: examplesForTask(t, effectiveLocale, defaultLocale, preferLocales),
  }));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEMANTIC_RESOLVE_TIMEOUT_MS);

  try {
    const response = await client.resolveSemantic(
      {
        text,
        locale: effectiveLocale,
        appId: spec.app.id,
        tasks,
        topK,
        bearerToken,
      },
      traceId
    );
    return response.matches ?? [];
  } finally {
    clearTimeout(timeoutId);
  }
}
