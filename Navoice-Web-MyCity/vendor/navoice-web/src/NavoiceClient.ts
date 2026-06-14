import type { LicenseValidateResponse, RouteResponse, RouteResponseChoice } from './models';
import { NAVOICE_SDK_VERSION } from './version';

export interface SemanticMatch {
  taskId: string;
  task_id?: string;
  confidence: number;
}

export interface ResolveSemanticParams {
  text: string;
  locale: string;
  appId: string;
  tasks: Array<{ id: string; title: string; screenId: string; keywords: string[]; examples: string[] }>;
  topK: number;
  bearerToken: string;
}

export interface ResolveSemanticCatalogParams {
  query: string;
  publishableKey: string;
  platform: "web";
  origin: string;
  sdkVersion: string;
}

export interface SemanticCatalogResult {
  intent: "navigate" | "showChoices" | "unsupported";
  screenId?: string;
  params?: Record<string, any>;
  choices?: Array<{
    id: string;
    title: string;
    entityType?: string | null;
  }>;
  say?: string;
  score?: number;
  _meta?: Record<string, any>;
}

const DEFAULT_BASE = 'https://api.navoice.io';

function ensureAbsoluteUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

function cleanBearer(token: string): string {
  return token.replace(/^\s*Bearer\s+/i, '').trim();
}

export class NavoiceHttpError extends Error {
  public readonly status: number;
  public readonly body?: string;

  constructor(status: number, message: string, body?: string) {
    super(message);
    this.name = 'NavoiceHttpError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Optional STT context for /api/stt (prompt, hints, contextual strings).
 * Improves ASR when provided from spec.stt by locale.
 */
export interface TranscribeSttOptions {
  prompt?: string;
  hints?: string[];
  contextualStrings?: string[];
}

/**
 * HTTP client for license, interpret, and STT APIs. Mirrors iOS NavoiceClient.
 */
export class NavoiceClient {
  public readonly baseURL: string;
  private readonly debug: boolean;

  constructor(baseURL: string = DEFAULT_BASE, options?: { debug?: boolean }) {
    this.baseURL = baseURL;
    this.debug = options?.debug ?? false;
  }

  private log(traceId: string, tag: string, data: unknown): void {
    if (this.debug) {
      console.log(`[${traceId}] [NAVOICE][${tag}]`, data);
    }
  }

  async validateWebLicense(
    publishableKey: string,
    appId: string,
    sdkVersion: string,
    traceId?: string
  ): Promise<LicenseValidateResponse> {
    const tid = traceId ?? 'nv_license';
    const url = ensureAbsoluteUrl(this.baseURL, '/api/license/validate');
    const origin = appId;
    const keyPrefix = publishableKey.length >= 6 ? publishableKey.slice(0, 6) : '(short)';
    const keyLen = publishableKey.length;

    this.log(tid, 'HTTP', { method: 'POST', path: '/api/license/validate', origin, sdk_version: sdkVersion, keyPrefix, keyLen });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publishable_key: publishableKey,
        platform: 'web',
        origin,
        sdk_version: sdkVersion,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as LicenseValidateResponse;
    if (this.debug) {
      console.log(`[${tid}] [NAVOICE][HTTP] license response`, {
        status: res.status,
        ok: data.ok,
        error: data.error ?? undefined,
        expires_at: data.expires_at != null ? '(present)' : undefined,
      });
    }
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? `License validate failed (${res.status})`);
    }
    return data;
  }

  async interpret(
    locale: string,
    text: string,
    spec: unknown,
    bearerToken: string,
    traceId?: string
  ): Promise<RouteResponse> {
    const tid = traceId ?? 'nv_interpret';
    const url = ensureAbsoluteUrl(this.baseURL, '/api/interpret');
    const token = cleanBearer(bearerToken);
    this.log(tid, 'HTTP', {
      method: 'POST',
      path: '/api/interpret',
      request: { locale, textLen: text.length, hasSpec: spec != null, hasBearer: token.length > 0 },
    });

  const normalizedText = String(text || "")
  .toLowerCase()
  .replace(/[^\w\sא-ת]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .replace(/works$/, "work");

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        locale,
        text: normalizedText,
        spec,
        context: { platform: 'web', sdk_version: NAVOICE_SDK_VERSION },
      }),
    });

    const raw = await res.text();
    if (this.debug) {
      let summary: unknown = { status: res.status };
      if (res.ok && raw.trim()) {
        try {
          const parsed = JSON.parse(raw) as { mode?: string; task?: { id?: string; confidence?: number }; screenId?: string; say?: string };
          summary = {
            status: res.status,
            mode: parsed.mode,
            taskId: parsed.task?.id,
            confidence: parsed.task?.confidence,
            screenId: parsed.screenId,
            sayPreview: typeof parsed.say === 'string' ? parsed.say.slice(0, 60) : undefined,
          };
        } catch {
          summary = { status: res.status };
        }
      } else if (!res.ok) {
        summary = { status: res.status, bodySnippet: raw.slice(0, 120) };
      }
      console.log(`[${tid}] [NAVOICE][HTTP] interpret response`, summary);
    }

    if (!res.ok) {
      throw new NavoiceHttpError(res.status, raw || `HTTP ${res.status}`, raw);
    }
    if (!raw.trim()) {
      throw new Error('Empty response body from /api/interpret');
    }

    try {
      return JSON.parse(raw) as RouteResponse;
    } catch {
      const salvaged = tryParseLooseInterpretBody(raw);
      if (salvaged) return salvaged;
      throw new Error(`Failed to decode /api/interpret JSON. Body: ${raw.slice(0, 200)}`);
    }
  }

  /**
   * Step 3.5: Semantic resolve – POST /api/semantic/resolve (embeddings), NOT full interpret.
   */
  async resolveSemantic(params: ResolveSemanticParams, traceId?: string): Promise<{ matches: SemanticMatch[] }> {
    const tid = traceId ?? 'nv_semantic';
    const url = ensureAbsoluteUrl(this.baseURL, '/api/semantic/resolve');
    const token = cleanBearer(params.bearerToken);
    this.log(tid, 'HTTP', {
      method: 'POST',
      path: '/api/semantic/resolve',
      request: {
        textPreview: params.text.slice(0, 50),
        locale: params.locale,
        appId: params.appId,
        tasksCount: params.tasks?.length ?? 0,
        topK: params.topK,
      },
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text: params.text,
        locale: params.locale,
        appId: params.appId,
        tasks: params.tasks,
        topK: params.topK,
      }),
    });

    const raw = await res.text();
    if (this.debug) {
      let count = 0;
      let top3: Array<{ taskId: string; confidence: number }> = [];
      if (res.ok && raw.trim()) {
        try {
          const data = JSON.parse(raw) as { matches?: Array<{ taskId?: string; task_id?: string; confidence: number }> };
          const m = data.matches ?? [];
          count = m.length;
          top3 = m.slice(0, 3).map((x) => ({ taskId: x.taskId ?? x.task_id ?? '', confidence: x.confidence }));
        } catch {
          //
        }
      }
      console.log(`[${tid}] [NAVOICE][HTTP] semantic response`, { status: res.status, matchesCount: count, top3 });
    }

    if (!res.ok) {
      throw new NavoiceHttpError(res.status, `Semantic resolve HTTP ${res.status}: ${raw}`, raw);
    }
    if (!raw.trim()) {
      return { matches: [] };
    }

    const data = JSON.parse(raw) as { matches?: Array<{ taskId?: string; task_id?: string; confidence: number }> };
    const matches: SemanticMatch[] = (data.matches ?? []).map((m) => ({
      taskId: m.taskId ?? m.task_id ?? '',
      confidence: typeof m.confidence === 'number' ? m.confidence : 0,
    }));
    return { matches };
  }

  async resolveSemanticCatalog(
  params: ResolveSemanticCatalogParams,
  traceId?: string
): Promise<SemanticCatalogResult> {
  const tid = traceId ?? "nv_semantic_catalog";

  const url = ensureAbsoluteUrl(this.baseURL, "/api/semanticCatalog/resolve");

  this.log(tid, "HTTP", {
    method: "POST",
    path: "/api/semanticCatalog/resolve",
    request: {
      queryPreview: params.query.slice(0, 50),
      platform: params.platform,
      origin: params.origin,
    },
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: params.query,
      publishable_key: params.publishableKey,
      platform: params.platform,
      origin: params.origin,
    }),
  });

  const raw = await res.text();

  if (this.debug) {
    console.log(`[${tid}] [NAVOICE][HTTP] semanticCatalog response`, {
      status: res.status,
      bodyPreview: raw.slice(0, 200),
    });
  }

  if (!res.ok) {
    throw new NavoiceHttpError(
      res.status,
      `SemanticCatalog resolve HTTP ${res.status}: ${raw}`,
      raw
    );
  }

  if (!raw.trim()) {
    throw new Error("Empty response from semanticCatalog");
  }

  return JSON.parse(raw) as SemanticCatalogResult;
}

  async transcribeAudio(
    audioBlob: Blob,
    locale: string,
    bearerToken: string,
    stt?: TranscribeSttOptions,
    traceId?: string
  ): Promise<string> {
    const tid = traceId ?? 'nv_stt';
    const url = ensureAbsoluteUrl(this.baseURL, '/api/stt');
    const token = cleanBearer(bearerToken);
    const form = new FormData();
    form.append('audio', audioBlob, 'audio.wav');
    form.append('locale', locale);
    if (stt?.prompt != null && stt.prompt !== '') {
      form.append('prompt', stt.prompt);
    }
    if (Array.isArray(stt?.hints) && stt.hints.length > 0) {
      form.append('hints', JSON.stringify(stt.hints));
    }
    if (Array.isArray(stt?.contextualStrings) && stt.contextualStrings.length > 0) {
      form.append('contextualStrings', JSON.stringify(stt.contextualStrings));
    }

    if (this.debug) {
      console.log(`[${tid}] [NAVOICE][HTTP] STT request`, {
        locale,
        blobType: audioBlob.type,
        blobSize: audioBlob.size,
        hasBearer: token.length > 0,
      });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Locale': locale,
      },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new NavoiceHttpError(res.status, text || `STT HTTP ${res.status}`, text);
    }

    const rawBody = await res.text();
    let data: { text?: string } | null = null;
    if (rawBody.trim()) {
      try {
        data = JSON.parse(rawBody) as { text?: string };
      } catch {
        data = null;
      }
    }
    const parsed = data && typeof data.text === 'string' ? data.text.trim() : '';
    if (parsed) {
      if (this.debug) {
        console.log(`[${tid}] [NAVOICE][HTTP] STT response`, { textPreview: parsed.slice(0, 80) });
      }
      return parsed;
    }
    if (rawBody.trim()) {
      if (this.debug) {
        console.log(`[${tid}] [NAVOICE][HTTP] STT response`, { textPreview: rawBody.trim().slice(0, 80) });
      }
      return rawBody.trim();
    }
    throw new Error('Empty STT result');
  }
}

function tryParseLooseInterpretBody(body: string): RouteResponse | null {
  const trimmed = body.trim();
  if (!trimmed) return null;

  const idMatch = trimmed.match(/(?:id|screenId|screen_id)\s*[:=]\s*([A-Za-z0-9._-]+)/);
  const id = idMatch?.[1];
  if (!id) return null;

  let confidence: number | undefined;
  const confPct = trimmed.match(/confidence\s*[:=]?\s*([0-9]{1,3})\s*%/);
  const confNum = trimmed.match(/confidence\s*[:=]\s*([0-9]*\.?[0-9]+)/);
  if (confPct?.[1]) confidence = Math.max(0, Math.min(1, Number(confPct[1]) / 100));
  else if (confNum?.[1]) {
    const v = Number(confNum[1]);
    confidence = v > 1 ? Math.max(0, Math.min(1, v / 100)) : v;
  }

  const sayMatch = trimmed.match(/say\s*[:=]\s*"([^"]+)"/);
  const say = sayMatch?.[1] ?? 'OK';

  return {
    mode: 'execute',
    task: { id, confidence: confidence ?? 1 },
    say,
    screenId: id,
    params: {},
    choices: undefined,
  };
}

export function mapChoice(c: RouteResponseChoice): { taskId: string; title: string; confidence: number; screenId: string | null; params: Record<string, string> | null } {
  return {
    taskId: c.task_id,
    title: c.title,
    confidence: c.confidence,
    screenId: c.screen_id ?? c.task_id,
    params: c.params ?? null,
  };
}
