/**
 * Lossy decode of app spec into RuntimeSpec shape for local routing, normalization, and semantic.
 * Does not mutate the original spec; used only for reading thresholds, stopwords, context, tasks, stt.
 */

export interface RuntimeSpecThresholds {
  execute_min_score: number;
  execute_min_conf: number;
  choices_min_score: number;
  choices_min_conf: number;
  close_to_second_delta: number;
  max_choices: number;
  semantic_enabled?: boolean;
  semantic_min_conf?: number;
  semantic_top_k?: number;
  semantic_prefer_locales?: boolean;
  semantic_cache_ttl_seconds?: number;
  stopwordsByLocale?: Record<string, string[]>;
}

export interface RuntimeSpecContextMemory {
  enabled?: boolean;
  followup_boost?: number;
  followupWindowSeconds?: number;
  relatedBoost?: number;
  synonymBoost?: number;
}

export interface RuntimeSpecContext {
  enabled?: boolean;
  max_expansions?: number;
  synonymsByLocale?: Record<string, Record<string, string[]>>;
  relatedIntents?: Record<string, string[]>;
  memory?: RuntimeSpecContextMemory;
}

export interface RuntimeSpecRouting {
  thresholds: RuntimeSpecThresholds;
  stopwords: string[];
  context?: RuntimeSpecContext;
}

export interface RuntimeSpecTaskAction {
  type: 'present' | 'navigate' | string;
  id?: string;
  screenId?: string;
}

export interface RuntimeSpecTask {
  id: string;
  title: string;
  screenId: string;
  keywords: string[];
  examples: string[];
  defaultParams?: Record<string, string>;
  keywordsByLocale?: Record<string, string[]>;
  examplesByLocale?: Record<string, string[]>;
  action?: RuntimeSpecTaskAction;
}

export interface RuntimeSpecSTTConfig {
  enabled?: boolean;
  languageByLocale?: Record<string, string>;
  promptsByLocale?: Record<string, string>;
  hintsByLocale?: Record<string, string[]>;
  contextualStringsByLocale?: Record<string, string[]>;
  replacementsByLocale?: Record<string, Record<string, string>>;
}

export interface RuntimeSpecApp {
  id: string;
  default_locale: string;
}

export interface RuntimeSpec {
  app: RuntimeSpecApp;
  routing: RuntimeSpecRouting;
  tasksRaw?: RuntimeSpecTask[];
  tasks?: RuntimeSpecTask[];
  stt?: RuntimeSpecSTTConfig;
}

const DEFAULT_THRESHOLDS: RuntimeSpecThresholds = {
  execute_min_score: 6.0,
  execute_min_conf: 0.75,
  choices_min_score: 3.0,
  choices_min_conf: 0.45,
  close_to_second_delta: 2.0,
  max_choices: 4,
};

function lossyNumber(val: unknown, defaultVal: number): number {
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  if (typeof val === 'string') {
    const n = Number(val);
    if (!Number.isNaN(n)) return n;
  }
  if (typeof val === 'boolean') return val ? 1 : 0;
  return defaultVal;
}

function lossyInt(val: unknown, defaultVal: number): number {
  const n = lossyNumber(val, defaultVal);
  return Math.max(0, Math.floor(n));
}

/**
 * Decode spec (unknown) into RuntimeSpec if possible. Returns null if shape is incompatible.
 */
export function tryDecodeRuntimeSpec(spec: unknown): { spec: RuntimeSpec; thresholds: RuntimeSpecThresholds } | null {
  if (spec === null || typeof spec !== 'object') return null;

  const o = spec as Record<string, unknown>;
  const app = o.app as Record<string, unknown> | undefined;
  const routing = o.routing as Record<string, unknown> | undefined;
  const tasksRaw = (o.tasks ?? o.tasksRaw) as unknown[] | undefined;
  const stt = o.stt as Record<string, unknown> | undefined;

  if (!routing || typeof routing !== 'object') return null;

  const th = (routing.thresholds as Record<string, unknown>) ?? {};
  const thresholds: RuntimeSpecThresholds = {
    execute_min_score: lossyNumber(th.execute_min_score, DEFAULT_THRESHOLDS.execute_min_score),
    execute_min_conf: lossyNumber(th.execute_min_conf, DEFAULT_THRESHOLDS.execute_min_conf),
    choices_min_score: lossyNumber(th.choices_min_score, DEFAULT_THRESHOLDS.choices_min_score),
    choices_min_conf: lossyNumber(th.choices_min_conf, DEFAULT_THRESHOLDS.choices_min_conf),
    close_to_second_delta: lossyNumber(th.close_to_second_delta, DEFAULT_THRESHOLDS.close_to_second_delta),
    max_choices: lossyInt(th.max_choices, DEFAULT_THRESHOLDS.max_choices),
    semantic_enabled: typeof th.semantic_enabled === 'boolean' ? th.semantic_enabled : undefined,
    semantic_min_conf: typeof th.semantic_min_conf === 'number' ? th.semantic_min_conf : undefined,
    semantic_top_k: typeof th.semantic_top_k === 'number' ? th.semantic_top_k : undefined,
    semantic_prefer_locales: typeof th.semantic_prefer_locales === 'boolean' ? th.semantic_prefer_locales : undefined,
    semantic_cache_ttl_seconds: typeof th.semantic_cache_ttl_seconds === 'number' ? th.semantic_cache_ttl_seconds : undefined,
    stopwordsByLocale: (th.stopwordsByLocale as Record<string, string[]>) ?? undefined,
  };

  const stopwords = Array.isArray(routing.stopwords)
    ? (routing.stopwords as string[]).filter((s) => typeof s === 'string')
    : [];

  const ctx = routing.context as Record<string, unknown> | undefined;
  const context: RuntimeSpecContext | undefined = ctx
    ? {
        enabled: ctx.enabled === true,
        max_expansions: lossyInt(ctx.max_expansions, 8),
        synonymsByLocale: ctx.synonymsByLocale as Record<string, Record<string, string[]>> | undefined,
        relatedIntents: ctx.relatedIntents as Record<string, string[]> | undefined,
        memory: ctx.memory as RuntimeSpecContextMemory | undefined,
      }
    : undefined;

  const tasks: RuntimeSpecTask[] = [];
  if (Array.isArray(tasksRaw)) {
    for (const t of tasksRaw) {
      if (t === null || typeof t !== 'object') continue;
      const task = t as Record<string, unknown>;
      const id = (task.id ?? task.taskId) as string | undefined;
      const title = task.title as string | undefined;
      const screenId = (task.screenId ?? task.screen_id) as string | undefined;
      if (!id || !title || !screenId) continue;
      const keywords = Array.isArray(task.keywords) ? (task.keywords as string[]).filter((s) => typeof s === 'string') : [];
      const examples = Array.isArray(task.examples) ? (task.examples as string[]).filter((s) => typeof s === 'string') : [];
      if (keywords.length === 0 && title) keywords.push(title);
      const rawAction = task.action;
      let action: RuntimeSpecTaskAction | undefined;
      if (rawAction != null && typeof rawAction === 'object' && typeof (rawAction as Record<string, unknown>).type === 'string') {
        const a = rawAction as Record<string, unknown>;
        action = {
          type: a.type as string,
          id: typeof a.id === 'string' ? a.id : undefined,
          screenId: typeof a.screenId === 'string' ? a.screenId : undefined,
        };
      }
      tasks.push({
        id,
        title,
        screenId,
        keywords,
        examples,
        defaultParams: (task.defaultParams as Record<string, string>) ?? undefined,
        keywordsByLocale: task.keywordsByLocale as Record<string, string[]> | undefined,
        examplesByLocale: task.examplesByLocale as Record<string, string[]> | undefined,
        action,
      });
    }
  }

  const full: RuntimeSpec = {
    app: {
      id: typeof app?.id === 'string' ? app.id : 'web',
      default_locale: typeof app?.default_locale === 'string' ? app.default_locale : 'en-US',
    },
    routing: {
      thresholds,
      stopwords,
      context,
    },
    tasksRaw: tasks,
    tasks,
    stt: stt && typeof stt === 'object' ? (stt as unknown as RuntimeSpecSTTConfig) : undefined,
  };

  return { spec: full, thresholds };
}

/**
 * Resolve stopwords for normalization: stopwordsByLocale[locale] → routing.stopwords → [].
 */
export function resolveStopwords(
  spec: RuntimeSpec | null,
  locale: string
): { list: string[]; source: string } {
  if (!spec?.routing) return { list: [], source: 'empty' };
  const byLocale = spec.routing.thresholds.stopwordsByLocale?.[locale];
  if (Array.isArray(byLocale) && byLocale.length > 0) {
    return { list: byLocale.filter((s) => typeof s === 'string'), source: `stopwordsByLocale[${locale}]` };
  }
  const list = spec.routing.stopwords ?? [];
  return { list, source: 'routing.stopwords' };
}
