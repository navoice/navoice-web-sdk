import { NavoiceClient, NavoiceHttpError, mapChoice } from './NavoiceClient';
import type { RouteResponse } from './models';
import { LearningStore } from './LearningStore';
import type { NavoiceResult, NavoiceChoice, NavoiceAuditEvent, PipelineTimings } from './types';
import { NAVOICE_SDK_VERSION } from './version';
import type { NavoiceSTTConfig } from './config';
// Cloud STT is used through routeAudio() -> client.transcribeAudio()
import { tryDecodeRuntimeSpec, resolveStopwords } from './runtimeSpec';
import { normalize } from './Normalizer';
import { routeLocal } from './LocalRouter';
import { expand } from './SpecContext';
import { SessionMemory } from './SessionMemory';
import { SemanticCache } from './SemanticCache';
import { resolveSemantic } from './SemanticResolver';
import type { RuntimeSpec } from './runtimeSpec';

const DEFAULT_BASE = 'https://api.navoice.io';
const LICENSE_STORAGE_PREFIX = 'navoice.license.';

function getAppId(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'web';
}

function parseISO8601(s: string): number | null {
  const n = Date.parse(s);
  return Number.isNaN(n) ? null : n;
}

export interface NavoiceOptions {
  baseURL?: string;
  publishableKey: string;
  spec: unknown;
  locale?: string;
  appId?: string;
  sttConfig?: NavoiceSTTConfig;
  debug?: boolean;
}

const defaultSTTConfig: NavoiceSTTConfig = {
  mode: 'localOnly',
  cloudFallbackEnabled: false,
};

/**
 * Navoice Web SDK – same API surface as the iOS SDK.
 * Voice-driven navigation: route text or voice to screenId + params.
 */
/** Generate a short trace id for a single utterance/pipeline run. */
function genTraceId(): string {
  const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  const t = typeof Date !== 'undefined' ? Date.now().toString(36) : '0';
  const r = Math.random().toString(36).slice(2, 7);
  return `nv_${t}_${r}`;
}

export class Navoice {
  private readonly baseURL: string;
  private readonly publishableKey: string;
  private readonly appId: string;
  private readonly locale: string;
  private readonly spec: unknown;
  private readonly client: NavoiceClient;
  private readonly sttConfig: NavoiceSTTConfig;
  private readonly debug: boolean;

  private licenseToken: string | null = null;
  private licenseExpiresAt: number | null = null;
private mediaRecorder: MediaRecorder | null = null;
private mediaStream: MediaStream | null = null;
private audioChunks: Blob[] = [];

  public onResult: ((result: NavoiceResult) => void) | null = null;
  public onAuditEvent: ((event: NavoiceAuditEvent) => void) | null = null;

  constructor(options: NavoiceOptions) {
    this.baseURL = options.baseURL ?? DEFAULT_BASE;
    this.publishableKey = options.publishableKey.trim();
    if (!this.publishableKey) {
      throw new Error('Missing publishableKey (NavoicePublishableKey)');
    }
    this.spec = options.spec;
    this.locale = options.locale ?? 'en-US';
    this.appId = options.appId ?? getAppId();
    this.sttConfig = options.sttConfig ?? defaultSTTConfig;
    this.debug =
      options.debug ?? (typeof window !== 'undefined' && !!(window as unknown as { __NAVOICE_DEBUG__?: boolean }).__NAVOICE_DEBUG__) ?? false;
    this.client = new NavoiceClient(this.baseURL, { debug: this.debug });

    this.loadLicenseFromStorage();

  }

  private storageKey(): string {
    return `${LICENSE_STORAGE_PREFIX}${this.publishableKey}.${this.appId}`;
  }

  private loadLicenseFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return;
      const cached = JSON.parse(raw) as { token: string; expiresAtISO: string };
      this.licenseToken = cached.token;
      this.licenseExpiresAt = parseISO8601(cached.expiresAtISO);
    } catch {
      // ignore
    }
  }

  private saveLicenseToStorage(token: string, expiresAtISO: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        this.storageKey(),
        JSON.stringify({ token, expiresAtISO })
      );
    } catch {
      // ignore
    }
  }

  private isTokenValid(): boolean {
    if (!this.licenseToken) return false;
    if (this.licenseExpiresAt == null) return false;
    return Date.now() < this.licenseExpiresAt - 60_000;
  }

  private getLicenseToken(): string {
    if (!this.licenseToken) throw new Error('Missing license token');
    return this.licenseToken;
  }

  private log(traceId: string, tag: string, data: unknown): void {
    if (this.debug) {
      console.log(`[${traceId}] [NAVOICE][${tag}]`, data);
    }
  }

  private perfNow(): number {
    return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
  }

  private async ensureLicensed(force = false): Promise<void> {
    const tid = 'nv_license';
    if (!force && this.isTokenValid()) {
      this.log(tid, 'LICENSE', {
        cacheHit: true,
        tokenValid: true,
        expiresAt: this.licenseExpiresAt != null ? new Date(this.licenseExpiresAt).toISOString() : undefined,
        storageKey: this.storageKey().slice(0, 30) + '...',
      });
      return;
    }

    if (!this.appId) {
      throw new Error('Missing appId (e.g. set origin or pass appId)');
    }

    this.log(tid, 'LICENSE', {
      cacheHit: false,
      tokenValid: false,
      storageKey: this.storageKey().slice(0, 30) + '...',
    });
    this.log(tid, 'LICENSE', { event: 'validate:start', baseURL: this.baseURL, appId: this.appId, sdkVersion: NAVOICE_SDK_VERSION });

    this.onAuditEvent?.({
      type: 'licenseValidateRequested',
      publishableKey: this.publishableKey,
      appId: this.appId,
    });

    try {
      const resp = await this.client.validateWebLicense(
        this.publishableKey,
        this.appId,
        NAVOICE_SDK_VERSION,
        tid
      );

      this.log(tid, 'LICENSE', { event: 'validate:ok', expiresAt: resp.expires_at, projectId: resp.project_id ?? null });
      this.onAuditEvent?.({
        type: 'licenseValidated',
        projectId: resp.project_id ?? null,
        expiresAtISO: resp.expires_at ?? null,
      });

      const token = resp.token?.trim();
      const expiresAtISO = resp.expires_at?.trim();
      if (!token || !expiresAtISO) {
        throw new Error('License response missing token/expires_at');
      }

      this.licenseToken = token;
      this.licenseExpiresAt = parseISO8601(expiresAtISO);
      this.saveLicenseToStorage(token, expiresAtISO);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log(tid, 'LICENSE', { event: 'validate:fail', error: message });
      const detailed = `License validation failed for appId: '${this.appId}', publishableKey: '${this.publishableKey}'. Error: ${message}`;
      this.onAuditEvent?.({ type: 'licenseValidateFailed', message: detailed });
      throw new Error(detailed);
    }
  }

  private mapResponse(res: RouteResponse): NavoiceResult {
    const say = res.say ?? 'OK';

    if (res.mode === 'execute') {
      const screenId = res.screenId ?? res.task?.id ?? 'unknown';
      const params = res.params ?? {};
      const confidence = res.task?.confidence ?? null;
      const taskId = res.task?.id;
      return {
        kind: 'execute',
        screenId,
        params,
        say,
        confidence: confidence ?? null,
        taskId: taskId ?? undefined,
      };
    }

    if (res.mode === 'show_choices' && res.choices?.length) {
      const mapped = res.choices.map((c) => mapChoice(c));
      const choices = LearningStore.boost(this.publishableKey, mapped);
      return { kind: 'showChoices', say, choices };
    }

    if (res.mode === 'plan_restricted') {
      return { kind: 'planRestricted', reason: res.reason ?? '', requiredPlan: res.requiredPlan ?? '' };
    }

    return { kind: 'unsupported', say };
  }

  private static logRouteResult(source: string, result: NavoiceResult, debug?: boolean): void {
    if (!debug) return;
    const kind = result.kind;
    const taskId = result.kind === 'execute' || result.kind === 'present' ? (result.taskId ?? '') : '';
    const target =
      result.kind === 'execute' ? result.screenId : result.kind === 'present' ? result.presentationId : '-';
    const traceId = (result as { traceId?: string }).traceId ?? '';
    if (kind === 'present') {
      console.log(`[${traceId}] [NAVOICE][Route] source=${source} result=${kind} taskId=${taskId} presentationId=${result.presentationId}`);
    } else {
      console.log(`[${traceId}] [NAVOICE][Route] source=${source} result=${kind} taskId=${taskId} target=${target}`);
    }
  }

  private static extractConfidenceAndTaskId(result: NavoiceResult): { confidence: number; taskId: string | null } {
    switch (result.kind) {
      case 'execute':
        return { confidence: result.confidence ?? 0, taskId: result.taskId ?? null };
      case 'present':
        return { confidence: result.confidence ?? 0, taskId: result.taskId ?? null };
      case 'showChoices':
        return {
          confidence: result.choices[0]?.confidence ?? 0,
          taskId: result.choices[0]?.taskId ?? null,
        };
      case 'unsupported':
        return { confidence: 0, taskId: null };
      case 'planRestricted':
        return { confidence: 0, taskId: null };
    }
  }

  private static applyPostASRReplacements(text: string, replacements: Record<string, string>, maxReplacements: number): string {
    const words = text.split(/\s+/);
    let applied = 0;
    const result = words.map((word) => {
      if (applied >= maxReplacements || !word) return word;
      const lower = word.toLowerCase();
      for (const [from, to] of Object.entries(replacements)) {
        if (from.toLowerCase() === lower) {
          applied += 1;
          return to;
        }
      }
      return word;
    });
    return result.join(' ');
  }

  private finalizeResult(
    result: NavoiceResult,
    traceId: string,
    timings: PipelineTimings,
    meta: { locale: string; rawPreview: string; normalizedPreview: string; usedLocal: boolean; usedSemantic: boolean; usedCloudInterpret: boolean; sttUsed: boolean }
  ): NavoiceResult {
    const withTraceId: NavoiceResult =
      result.kind === 'execute'
        ? { ...result, traceId }
        : result.kind === 'present'
          ? { ...result, traceId }
          : result.kind === 'showChoices'
            ? { ...result, traceId }
            : { ...result, traceId };

    if (this.debug) {
      const decisionKind = result.kind;
      const taskId = result.kind === 'execute' || result.kind === 'present' ? result.taskId : undefined;
      const screenId = result.kind === 'execute' ? result.screenId : undefined;
      const presentationId = result.kind === 'present' ? result.presentationId : undefined;
      const confidence = result.kind === 'execute' || result.kind === 'present' ? result.confidence : undefined;
      console.log(`[${traceId}] [NAVOICE][SUMMARY]`, {
        locale: meta.locale,
        rawTextPreview: meta.rawPreview,
        normalizedTextPreview: meta.normalizedPreview,
        decisionKind,
        taskId,
        screenId,
        presentationId,
        confidence,
        usedLocal: meta.usedLocal,
        usedSemantic: meta.usedSemantic,
        usedCloudInterpret: meta.usedCloudInterpret,
        sttUsed: meta.sttUsed,
        timings,
      });
      console.log(`[${traceId}] [NAVOICE][TIMING]`, { step: 'TOTAL', ms: timings.total ?? 0 });
      console.groupEnd();
    }
    return withTraceId;
  }

  /**
   * Route text: Normalize → LocalRouter (with optional Spec Context) → Semantic (conditional) → Cloud.
   */
  async route(text: string, opts?: { traceId?: string; sttDurationMs?: number; sttUsed?: boolean }): Promise<NavoiceResult> {
    const traceId = opts?.traceId ?? genTraceId();
    const metaSttUsed = opts?.sttUsed === true || (opts?.sttDurationMs != null && opts.sttDurationMs >= 0);
    const t0 = this.perfNow();
    const timings: PipelineTimings = {
      stt: opts?.sttDurationMs,
      normalize: 0,
      local: 0,
      semantic: 0,
      cloud: 0,
      total: 0,
    };

    if (this.debug) {
      console.groupCollapsed(`[${traceId}] NAVOICE PIPELINE`);
    }

    const clean = text.trim();
    if (!clean) {
      const result: NavoiceResult = { kind: 'unsupported', say: 'Type or say something 🙂' };
      timings.total = this.perfNow() - t0;
      return this.finalizeResult(result, traceId, timings, {
        locale: this.locale,
        rawPreview: '',
        normalizedPreview: '',
        usedLocal: false,
        usedSemantic: false,
        usedCloudInterpret: false,
        sttUsed: metaSttUsed,
      });
    }

    this.log(traceId, 'PIPELINE', { input: { rawText: clean.slice(0, 100), locale: this.locale } });

    const decoded = tryDecodeRuntimeSpec(this.spec);
    const stopwordsRes = resolveStopwords(decoded?.spec ?? null, this.locale);
    const replacements =
      decoded?.spec?.stt?.replacementsByLocale?.[this.locale] && Object.keys(decoded.spec.stt.replacementsByLocale[this.locale]).length > 0
        ? decoded.spec.stt.replacementsByLocale[this.locale]
        : undefined;

    const tNormStart = this.perfNow();
    const norm = normalize(clean, this.locale, stopwordsRes.list, replacements);
    timings.normalize = this.perfNow() - tNormStart;
    this.log(traceId, 'STEP2', { normalized: norm.normalizedText, rawToNormalized: { raw: clean.slice(0, 80), normalized: norm.normalizedText.slice(0, 80) } });
    this.log(traceId, 'TIMING', { step: 'normalize', ms: timings.normalize });

    if (!norm.normalizedText) {
      timings.total = this.perfNow() - t0;
      const result: NavoiceResult = { kind: 'unsupported', say: 'Type or say something 🙂' };
      return this.finalizeResult(result, traceId, timings, {
        locale: this.locale,
        rawPreview: clean.slice(0, 60),
        normalizedPreview: '',
        usedLocal: false,
        usedSemantic: false,
        usedCloudInterpret: false,
        sttUsed: metaSttUsed,
      });
    }

    const thresholds = decoded?.thresholds ?? null;
    const fullSpec = decoded?.spec ?? null;

    if (fullSpec && decoded) {
      const ctx = fullSpec.routing?.context;
      const useContext = ctx?.enabled === true;

      this.log(traceId, 'STEP3', {
        synonymsCount: ctx?.synonymsByLocale?.[this.locale] ? Object.keys(ctx.synonymsByLocale[this.locale]).length : 0,
        relatedIntentsCount: ctx?.relatedIntents ? Object.keys(ctx.relatedIntents).length : 0,
        sessionMemoryKeysCount: SessionMemory.lastResult ? 1 : 0,
      });

      if (useContext) {
        const candidates = expand(norm.normalizedText, this.locale, fullSpec, {
          lastResult: SessionMemory.lastResult,
          isWithinWindow: (s) => SessionMemory.isWithinWindow(s),
        });
        const executeMinConf = thresholds?.execute_min_conf ?? 0.75;
        const choicesMinConf = thresholds?.choices_min_conf ?? 0.45;
        const relatedBoost = ctx?.memory?.relatedBoost ?? 1.15;

        let bestResult: NavoiceResult | null = null;
        let bestEffectiveConf = -1;
        for (const candidate of candidates) {
          const res = routeLocal(candidate.text, fullSpec, thresholds, this.debug);
          const { confidence: baseConf, taskId: resultTaskId } = Navoice.extractConfidenceAndTaskId(res);
          let effectiveConf = Math.min(1, baseConf * candidate.weight);
          const last = SessionMemory.lastResult;
          if (last?.taskId && resultTaskId && ctx.relatedIntents?.[last.taskId]?.includes(resultTaskId)) {
            effectiveConf = Math.min(1, effectiveConf * relatedBoost);
            this.log(traceId, 'SpecContext', { relatedBoostApplied: true, lastTaskId: last.taskId, currentTaskId: resultTaskId, boost: relatedBoost });
          }
          this.log(traceId, 'SpecContext', { try: candidate.text.slice(0, 50), weight: candidate.weight, baseConf, effectiveConf });
          switch (res.kind) {
            case 'execute':
            case 'present':
              if (effectiveConf >= executeMinConf && effectiveConf > bestEffectiveConf) {
                bestEffectiveConf = effectiveConf;
                bestResult = res;
              }
              break;
            case 'showChoices':
              if (effectiveConf >= choicesMinConf && effectiveConf > bestEffectiveConf) {
                bestEffectiveConf = effectiveConf;
                bestResult = res;
              }
              break;
            case 'unsupported':
              break;
          }
        }
        if (bestResult) {
          if (this.debug) {
            this.log(traceId, 'STEP1', { event: 'localRouter:contextBest', effectiveConf: bestEffectiveConf });
          }
          if (bestResult.kind === 'execute' || bestResult.kind === 'present') SessionMemory.update(bestResult);
          if (bestResult.kind === 'execute' || bestResult.kind === 'present') {
            Navoice.logRouteResult('local', bestResult, this.debug);
            timings.total = this.perfNow() - t0;
            return this.finalizeResult(bestResult, traceId, timings, {
              locale: this.locale,
              rawPreview: clean.slice(0, 60),
              normalizedPreview: norm.normalizedText.slice(0, 60),
              usedLocal: true,
              usedSemantic: false,
              usedCloudInterpret: false,
              sttUsed: metaSttUsed,
            });
          }
          if (bestResult.kind === 'showChoices') {
            const boosted = LearningStore.boost(this.publishableKey, bestResult.choices);
            const res: NavoiceResult = { kind: 'showChoices', say: bestResult.say, choices: boosted };
            Navoice.logRouteResult('local', res, this.debug);
            timings.total = this.perfNow() - t0;
            return this.finalizeResult(res, traceId, timings, {
              locale: this.locale,
              rawPreview: clean.slice(0, 60),
              normalizedPreview: norm.normalizedText.slice(0, 60),
              usedLocal: true,
              usedSemantic: false,
              usedCloudInterpret: false,
              sttUsed: metaSttUsed,
            });
          }
        }
      } else {
        this.log(traceId, 'STEP1', {
          event: 'localRouter:start',
          thresholdsFromSpec: thresholds
            ? {
                execute_min_score: thresholds.execute_min_score,
                execute_min_conf: thresholds.execute_min_conf,
                choices_min_score: thresholds.choices_min_score,
                choices_min_conf: thresholds.choices_min_conf,
              }
            : null,
          tasksCount: (fullSpec.tasksRaw ?? fullSpec.tasks ?? []).length,
        });
        const tLocalStart = this.perfNow();
        const localResult = routeLocal(norm.normalizedText, fullSpec, thresholds, this.debug);
        timings.local = this.perfNow() - tLocalStart;
        this.log(traceId, 'TIMING', { step: 'localRouter', ms: timings.local });

        const hit = localResult.kind === 'execute' || localResult.kind === 'present';
        this.log(traceId, 'STEP1', {
          event: 'localRouter:top',
          taskId: hit ? (localResult as { taskId?: string }).taskId : undefined,
          confidence: hit ? (localResult as { confidence?: number }).confidence : undefined,
          actionType: localResult.kind === 'present' ? 'present' : localResult.kind === 'execute' ? 'execute' : undefined,
          actionId: localResult.kind === 'present' ? (localResult as { presentationId?: string }).presentationId : undefined,
          screenId: localResult.kind === 'execute' ? (localResult as { screenId?: string }).screenId : undefined,
        });
        this.log(traceId, 'STEP1', {
          event: 'localRouter:decision',
          hit,
          reason: hit ? 'aboveThreshold' : localResult.kind === 'showChoices' ? 'choices' : 'belowThreshold',
        });

        switch (localResult.kind) {
          case 'execute':
          case 'present':
            SessionMemory.update(localResult);
            Navoice.logRouteResult('local', localResult, this.debug);
            timings.total = this.perfNow() - t0;
            return this.finalizeResult(localResult, traceId, timings, {
              locale: this.locale,
              rawPreview: clean.slice(0, 60),
              normalizedPreview: norm.normalizedText.slice(0, 60),
              usedLocal: true,
              usedSemantic: false,
              usedCloudInterpret: false,
              sttUsed: metaSttUsed,
            });
          case 'showChoices': {
            const boosted = LearningStore.boost(this.publishableKey, localResult.choices);
            const res: NavoiceResult = { kind: 'showChoices', say: localResult.say, choices: boosted };
            Navoice.logRouteResult('local', res, this.debug);
            timings.total = this.perfNow() - t0;
            return this.finalizeResult(res, traceId, timings, {
              locale: this.locale,
              rawPreview: clean.slice(0, 60),
              normalizedPreview: norm.normalizedText.slice(0, 60),
              usedLocal: true,
              usedSemantic: false,
              usedCloudInterpret: false,
              sttUsed: metaSttUsed,
            });
          }
          case 'unsupported':
            break;
        }
      }
    } else {
      if (this.debug) {
        this.log(traceId, 'STEP1', { event: 'localRouter:skip', reason: 'RuntimeSpec decode FAILED' });
      }
    }

    await this.ensureLicensed();
    const token = this.licenseToken;
    if (!token) {
      timings.total = this.perfNow() - t0;
      const result: NavoiceResult = {
        kind: 'unsupported',
        say: 'License is not active. Contact your administrator or subscribe to continue.',
      };
      return this.finalizeResult(result, traceId, timings, {
        locale: this.locale,
        rawPreview: clean.slice(0, 60),
        normalizedPreview: norm.normalizedText.slice(0, 60),
        usedLocal: false,
        usedSemantic: false,
        usedCloudInterpret: false,
        sttUsed: metaSttUsed,
      });
    }

    const semanticEnabled = thresholds?.semantic_enabled !== false;
    if (semanticEnabled && fullSpec && (fullSpec.tasksRaw?.length ?? fullSpec.tasks?.length ?? 0) > 0) {
      this.log(traceId, 'STEP3.5', { event: 'semantic:start', topK: thresholds?.semantic_top_k ?? 3, locale: this.locale });
      const cacheKey = SemanticCache.key(norm.normalizedText, this.locale);
      const ttl = thresholds?.semantic_cache_ttl_seconds ?? 120;
      let matches = SemanticCache.get(cacheKey, ttl);
      const tSemStart = this.perfNow();
      let semanticRetryUsed = false;
      if (!matches || matches.length === 0) {
        try {
          matches = await resolveSemantic(
            norm.normalizedText,
            this.locale,
            fullSpec,
            thresholds?.semantic_top_k ?? 3,
            thresholds?.semantic_prefer_locales ?? true,
            this.client,
            token,
            traceId
          );
          SemanticCache.set(cacheKey, matches);
        } catch (err) {
          if (err instanceof NavoiceHttpError && err.status === 401 && !semanticRetryUsed) {
            semanticRetryUsed = true;
            try {
              await this.ensureLicensed(true);
              const newToken = this.getLicenseToken();
              matches = await resolveSemantic(
                norm.normalizedText,
                this.locale,
                fullSpec,
                thresholds?.semantic_top_k ?? 3,
                thresholds?.semantic_prefer_locales ?? true,
                this.client,
                newToken,
                traceId
              );
              SemanticCache.set(cacheKey, matches);
            } catch (retryErr) {
              if (this.debug) {
                this.log(traceId, 'STEP3.5', {
                  event: 'semantic:fail',
                  error: retryErr instanceof Error ? retryErr.message : String(retryErr),
                  originalError: err instanceof Error ? err.message : String(err),
                });
              }
            }
          } else if (this.debug) {
            this.log(traceId, 'STEP3.5', { event: 'semantic:fail', error: err instanceof Error ? err.message : String(err) });
          }
        }
      }
      timings.semantic = this.perfNow() - tSemStart;
      this.log(traceId, 'TIMING', { step: 'semantic', ms: timings.semantic });
      if (matches?.length) {
        this.log(traceId, 'STEP3.5', {
          event: 'semantic:matches',
          top5: matches.slice(0, 5).map((m) => ({ taskId: m.taskId, confidence: m.confidence })),
        });
      }
      const semanticMinConf = thresholds?.semantic_min_conf ?? 0.62;
      const best = matches?.[0];
      if (best && best.confidence >= semanticMinConf) {
        const tasks = fullSpec.tasksRaw ?? fullSpec.tasks ?? [];
        const task = tasks.find((t) => t.id === best.taskId);
        if (task) {
          const say = `Navigating to: ${task.title}`;
          const act = task.action;
          const isPresent = act?.type === 'present' && (act?.id ?? '').trim().length > 0;
          if (isPresent && act?.id?.trim()) {
            this.log(traceId, 'STEP3.5', { event: 'semantic:decision', used: true, selectedTaskId: task.id });
            const result: NavoiceResult = {
              kind: 'present',
              presentationId: act.id.trim(),
              params: task.defaultParams ?? {},
              say,
              confidence: best.confidence,
              taskId: task.id,
            };
            SessionMemory.update(result);
            Navoice.logRouteResult('semantic', result, this.debug);
            timings.total = this.perfNow() - t0;
            return this.finalizeResult(result, traceId, timings, {
              locale: this.locale,
              rawPreview: clean.slice(0, 60),
              normalizedPreview: norm.normalizedText.slice(0, 60),
              usedLocal: false,
              usedSemantic: true,
              usedCloudInterpret: false,
              sttUsed: metaSttUsed,
            });
          }
          const screenId = (act?.screenId?.trim() && act?.screenId) || task.screenId;
          this.log(traceId, 'STEP3.5', { event: 'semantic:decision', used: true, selectedTaskId: task.id });
          const result: NavoiceResult = {
            kind: 'execute',
            screenId,
            params: task.defaultParams ?? {},
            say,
            confidence: best.confidence,
            taskId: task.id,
          };
          SessionMemory.update(result);
          Navoice.logRouteResult('semantic', result, this.debug);
          timings.total = this.perfNow() - t0;
          return this.finalizeResult(result, traceId, timings, {
            locale: this.locale,
            rawPreview: clean.slice(0, 60),
            normalizedPreview: norm.normalizedText.slice(0, 60),
            usedLocal: false,
            usedSemantic: true,
            usedCloudInterpret: false,
            sttUsed: metaSttUsed,
          });
        }
      }
      this.log(traceId, 'STEP3.5', { event: 'semantic:decision', used: false, reason: `no match above semantic_min_conf=${semanticMinConf}` });
    } else {
      if (this.debug) {
        this.log(traceId, 'STEP3.5', {
          event: 'semantic:skip',
          reason: !semanticEnabled ? 'semantic_enabled=false' : !fullSpec || (fullSpec.tasksRaw?.length ?? 0) === 0 ? 'no tasks' : undefined,
        });
      }
    }
        try {
      this.log(traceId, 'STEP3.6', {
        event: 'semanticCatalog:start',
        queryPreview: norm.normalizedText.slice(0, 80),
      });

      const catalogResult = await this.client.resolveSemanticCatalog(
        {
          query: norm.normalizedText,
          publishableKey: this.publishableKey,
          platform: 'web',
          origin: this.appId,
          sdkVersion: NAVOICE_SDK_VERSION,
        },
        traceId
      );

      if (catalogResult.intent === 'navigate' && catalogResult.screenId) {
        const result: NavoiceResult = {
          kind: 'execute',
          screenId: catalogResult.screenId,
          params: catalogResult.params ?? {},
          say: 'OK',
          confidence: typeof catalogResult.score === 'number' ? catalogResult.score : null,
          taskId: undefined,
        };

        SessionMemory.update(result);
        Navoice.logRouteResult('semantic_catalog', result, this.debug);

        timings.total = this.perfNow() - t0;
        return this.finalizeResult(result, traceId, timings, {
          locale: this.locale,
          rawPreview: clean.slice(0, 60),
          normalizedPreview: norm.normalizedText.slice(0, 60),
          usedLocal: false,
          usedSemantic: true,
          usedCloudInterpret: false,
          sttUsed: metaSttUsed,
        });
      }

      if (catalogResult.intent === 'showChoices' && Array.isArray(catalogResult.choices)) {
        const result: NavoiceResult = {
          kind: 'showChoices',
          say: 'I found a few possible matches:',
          choices: catalogResult.choices.map((choice) => ({
            taskId: choice.id,
            title: choice.title,
            confidence: typeof catalogResult.score === 'number' ? catalogResult.score : 0,
            screenId: catalogResult.screenId ?? 'catalogItemDetails',
            params: {
              itemId: choice.id,
            },
          })),
        };

        Navoice.logRouteResult('semantic_catalog', result, this.debug);

        timings.total = this.perfNow() - t0;
        return this.finalizeResult(result, traceId, timings, {
          locale: this.locale,
          rawPreview: clean.slice(0, 60),
          normalizedPreview: norm.normalizedText.slice(0, 60),
          usedLocal: false,
          usedSemantic: true,
          usedCloudInterpret: false,
          sttUsed: metaSttUsed,
        });
      }

      this.log(traceId, 'STEP3.6', {
        event: 'semanticCatalog:decision',
        used: false,
        intent: catalogResult.intent,
      });
    } catch (err) {
      this.log(traceId, 'STEP3.6', {
        event: 'semanticCatalog:fail',
        error: err instanceof Error ? err.message : String(err),
      });
    }
    
    this.log(traceId, 'CLOUD', { event: 'interpret:start', url: `${this.baseURL.replace(/\/$/, '')}/api/interpret` });
    const tCloudStart = this.perfNow();
    let res: RouteResponse;
    let interpretRetryUsed = false;
    try {
      res = await this.client.interpret(this.locale, norm.normalizedText, this.spec, token, traceId);
    } catch (err) {
      if (err instanceof NavoiceHttpError && err.status === 401 && !interpretRetryUsed) {
        interpretRetryUsed = true;
        const originalErr = err;
        try {
          await this.ensureLicensed(true);
          const newToken = this.getLicenseToken();
          res = await this.client.interpret(this.locale, norm.normalizedText, this.spec, newToken, traceId);
        } catch {
          // Re-validation failed: return the original failure normally.
          throw originalErr;
        }
      } else {
        throw err;
      }
    }
    timings.cloud = this.perfNow() - tCloudStart;
    this.log(traceId, 'TIMING', { step: 'cloud', ms: timings.cloud });

    const say = res.say ?? 'OK';
    if (res.mode === 'execute') {
      this.log(traceId, 'CLOUD', {
        event: 'interpret:ok',
        mode: res.mode,
        taskId: res.task?.id,
        confidence: res.task?.confidence,
        screenId: res.screenId,
        actionType: res.task ? (fullSpec ? (fullSpec.tasksRaw ?? fullSpec.tasks ?? []).find((t) => t.id === res.task?.id)?.action?.type : undefined) : undefined,
        actionId: res.task ? (fullSpec ? (fullSpec.tasksRaw ?? fullSpec.tasks ?? []).find((t) => t.id === res.task?.id)?.action?.id : undefined) : undefined,
      });
      const cloudScreenId = res.screenId ?? res.task?.id ?? 'unknown';
      const cloudTaskId = res.task?.id;
      const params = res.params ?? {};
      const task = fullSpec ? (fullSpec.tasksRaw ?? fullSpec.tasks ?? []).find((t) => t.id === cloudTaskId || t.screenId === cloudScreenId) : null;
      let result: NavoiceResult;
      if (task?.action?.type === 'present' && task.action.id?.trim()) {
        result = {
          kind: 'present',
          presentationId: task.action.id.trim(),
          params,
          say,
          confidence: res.task?.confidence ?? null,
          taskId: cloudTaskId ?? task.id,
        };
      } else {
        const screenId = task?.action?.screenId?.trim() ? task.action.screenId! : (task?.screenId ?? cloudScreenId);
        result = {
          kind: 'execute',
          screenId,
          params,
          say,
          confidence: res.task?.confidence ?? null,
          taskId: cloudTaskId ?? task?.id,
        };
      }
      SessionMemory.update(result);
      Navoice.logRouteResult('cloud', result, this.debug);
      timings.total = this.perfNow() - t0;
      return this.finalizeResult(result, traceId, timings, {
        locale: this.locale,
        rawPreview: clean.slice(0, 60),
        normalizedPreview: norm.normalizedText.slice(0, 60),
        usedLocal: false,
        usedSemantic: false,
        usedCloudInterpret: true,
        sttUsed: metaSttUsed,
      });
    }

    if (res.mode === 'show_choices' && res.choices?.length) {
      this.log(traceId, 'CLOUD', { event: 'interpret:ok', mode: res.mode, choicesCount: res.choices.length });
      const mapped = res.choices.map((c) => mapChoice(c));
      const boosted = LearningStore.boost(this.publishableKey, mapped);
      const result: NavoiceResult = { kind: 'showChoices', say, choices: boosted };
      Navoice.logRouteResult('cloud', result, this.debug);
      timings.total = this.perfNow() - t0;
      return this.finalizeResult(result, traceId, timings, {
        locale: this.locale,
        rawPreview: clean.slice(0, 60),
        normalizedPreview: norm.normalizedText.slice(0, 60),
        usedLocal: false,
        usedSemantic: false,
        usedCloudInterpret: true,
        sttUsed: metaSttUsed,
      });
    }

    if (res.mode === 'plan_restricted') {
      this.log(traceId, 'CLOUD', { event: 'interpret:ok', mode: 'plan_restricted', reason: res.reason });
      const prResult: NavoiceResult = {
        kind: 'planRestricted',
        reason: res.reason ?? '',
        requiredPlan: res.requiredPlan ?? '',
      };
      Navoice.logRouteResult('cloud', prResult, this.debug);
      timings.total = this.perfNow() - t0;
      return this.finalizeResult(prResult, traceId, timings, {
        locale: this.locale,
        rawPreview: clean.slice(0, 60),
        normalizedPreview: norm.normalizedText.slice(0, 60),
        usedLocal: false,
        usedSemantic: false,
        usedCloudInterpret: true,
        sttUsed: metaSttUsed,
      });
    }

    this.log(traceId, 'CLOUD', { event: 'interpret:ok', mode: 'unsupported', sayPreview: say.slice(0, 60) });
    const unsupportedResult: NavoiceResult = { kind: 'unsupported', say };
    Navoice.logRouteResult('cloud', unsupportedResult, this.debug);
    timings.total = this.perfNow() - t0;
    return this.finalizeResult(unsupportedResult, traceId, timings, {
      locale: this.locale,
      rawPreview: clean.slice(0, 60),
      normalizedPreview: norm.normalizedText.slice(0, 60),
      usedLocal: false,
      usedSemantic: false,
      usedCloudInterpret: true,
      sttUsed: metaSttUsed,
    });
  }

  /**
   * Route text and call onResult with the result (or unsupported on error).
   */
  routeAndCallback(text: string, opts?: { traceId?: string; sttDurationMs?: number }): void {
    const callback = this.onResult;
    this.route(text, opts)
      .then((result) => callback?.(result))
      .catch((err) => {
        const say = err instanceof Error ? err.message : String(err);
        callback?.({ kind: 'unsupported', say });
      });
  }

  /**
   * Route an audio blob through built-in STT, then the existing pipeline.
   * Use this when you have recorded audio (e.g. from MediaRecorder) and want
   * the SDK to transcribe it and route the text. The returned result has
   * sttUsed: true and timings.stt set. Does not change route(text) behavior.
   */
  async routeAudio(
    audioBlob: Blob,
    options?: { locale?: string }
  ): Promise<NavoiceResult> {
    const traceId = genTraceId();
    const locale = (options?.locale ?? this.locale).trim() || this.locale;

    if (!audioBlob || audioBlob.size === 0) {
      this.log(traceId, 'STT', { event: 'routeAudio:invalid', reason: 'empty blob' });
      const result: NavoiceResult = { kind: 'unsupported', say: 'No audio provided', traceId };
      return { ...result, sttUsed: true, timings: { stt: 0 } };
    }

    this.log(traceId, 'STT', { event: 'Transcription start' });
    this.onAuditEvent?.({ type: 'cloudSTTRequested', audioBytes: audioBlob.size });

    const tSttStart = this.perfNow();
    try {
      await this.ensureLicensed();
      const token = this.getLicenseToken();
      const decoded = tryDecodeRuntimeSpec(this.spec);
      const sttConfig = decoded?.spec?.stt;
      const prompt = sttConfig?.promptsByLocale?.[locale];
      const hints = sttConfig?.hintsByLocale?.[locale];
      const contextualStrings = sttConfig?.contextualStringsByLocale?.[locale];
      const sttOptions =
        prompt != null || (Array.isArray(hints) && hints.length > 0) || (Array.isArray(contextualStrings) && contextualStrings.length > 0)
          ? { prompt, hints, contextualStrings }
          : undefined;

      let transcribedText: string;
      let transcribeRetryUsed = false;
      try {
        transcribedText = await this.client.transcribeAudio(audioBlob, locale, token, sttOptions, traceId);
      } catch (err) {
        if (err instanceof NavoiceHttpError && err.status === 401 && !transcribeRetryUsed) {
          transcribeRetryUsed = true;
          const originalErr = err;
          try {
            await this.ensureLicensed(true);
            const newToken = this.getLicenseToken();
            transcribedText = await this.client.transcribeAudio(audioBlob, locale, newToken, sttOptions, traceId);
          } catch {
            // Re-validation failed: return the original failure normally.
            throw originalErr;
          }
        } else {
          throw err;
        }
      }
      const sttDurationMs = Math.round(this.perfNow() - tSttStart);
      const trimmed = (transcribedText ?? '').trim();

      this.log(traceId, 'STT', { event: 'Transcription success' });
      this.log(traceId, 'STT', { event: 'Transcription text preview', textPreview: trimmed.slice(0, 80) });
      this.log(traceId, 'STT', { event: 'STT timing ms', ms: sttDurationMs });
      this.onAuditEvent?.({ type: 'cloudSTTUsed', transcriptLength: trimmed.length });

      if (!trimmed) {
        const result: NavoiceResult = { kind: 'unsupported', say: 'No speech detected', traceId };
        return { ...result, sttUsed: true, timings: { stt: sttDurationMs } };
      }

      const result = await this.route(trimmed, { traceId, sttDurationMs });
      return { ...result, sttUsed: true, timings: { ...(result.timings ?? {}), stt: sttDurationMs } };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log(traceId, 'STT', { event: 'Transcription fail', error: message });
      this.onAuditEvent?.({ type: 'cloudSTTFailed', message });
      const result: NavoiceResult = { kind: 'unsupported', say: `STT error: ${message}`, traceId };
      return { ...result, sttUsed: true, timings: { stt: Math.round(this.perfNow() - tSttStart) } };
    }
  }

  /**
   * Record that the user chose this screen (for learning/boost).
   */
  recordUserChoice(screenId: string): void {
    LearningStore.recordChoice(this.publishableKey, screenId);
  }

  /**
   * Start listening (browser mic + optional local STT).
   */
startVoice(): void {
  if (this.sttConfig.mode === 'disabled') return;

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    this.onResult?.({ kind: 'unsupported', say: 'Microphone is not supported in this browser' });
    return;
  }

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      this.mediaStream = stream;
      this.audioChunks = [];

      const recorder = new MediaRecorder(stream);
      this.mediaRecorder = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      recorder.start();
    })
    .catch(() => {
      this.onResult?.({ kind: 'unsupported', say: 'Microphone permission denied' });
    });
}

stopVoice(): void {
  const recorder = this.mediaRecorder;

  if (!recorder) return;

  recorder.onstop = async () => {
    const mimeType = this.audioChunks[0]?.type || 'audio/webm';
    const audioBlob = new Blob(this.audioChunks, { type: mimeType });

    this.mediaStream?.getTracks().forEach((track) => track.stop());

    this.mediaRecorder = null;
    this.mediaStream = null;
    this.audioChunks = [];

    const result = await this.routeAudio(audioBlob, { locale: this.locale });
    this.onResult?.(result);
  };

  recorder.stop();
}
}
