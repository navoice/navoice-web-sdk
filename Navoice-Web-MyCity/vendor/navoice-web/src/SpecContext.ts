/**
 * SpecContext – parity with iOS SpecContextEngine.
 * Expand normalized text into candidates (original + synonyms + memory follow-up + plural).
 * Boosts applied before scoring; do not mutate original spec.
 */

import type { RuntimeSpec, RuntimeSpecContext } from './runtimeSpec';
import { SessionMemory, type LastResult } from './SessionMemory';

const FOLLOWUP_PREFIXES = ['what about', 'and', 'also', 'tomorrow', 'today', 'there', 'here'];
const MAX_SYNONYM_CANDIDATES = 5;

export type CandidateReason = 'original' | 'synonym' | 'memory' | 'plural';

export interface ExpandedCandidate {
  text: string;
  reason: CandidateReason;
  weight: number;
}

function pluralNormalize(text: string): string {
  const tokens = text.split(/\s+/).filter(Boolean);
  const normalized = tokens.map((token) => {
    const t = token.toLowerCase();
    if (t.endsWith('ies') && t.length >= 4) {
      return t.slice(0, -3) + 'y';
    }
    if (t.endsWith('s') && t.length > 3) {
      return t.slice(0, -1);
    }
    return token;
  });
  return normalized.join(' ');
}

/**
 * Expand normalized text into candidates (original + synonyms + optional memory follow-up + plural).
 * Returns candidates sorted by weight descending; first is always original.
 */
export function expand(
  text: string,
  locale: string,
  spec: RuntimeSpec,
  memory: { lastResult: LastResult | null; isWithinWindow: (seconds: number) => boolean }
): ExpandedCandidate[] {
  const ctx: RuntimeSpecContext | undefined = spec.routing?.context;
  const maxExp = Math.max(8, ctx?.max_expansions ?? 8);
  const synonymsByLocale = ctx?.synonymsByLocale ?? {};
  const localeKey = locale.slice(0, 2).toLowerCase();
  const synonymMap: Record<string, string[]> = synonymsByLocale[localeKey] ?? synonymsByLocale[locale] ?? synonymsByLocale['en'] ?? {};
  const memoryCfg = ctx?.memory;
  const followupBoost = memoryCfg?.followup_boost ?? 1.2;
  const synonymBoost = memoryCfg?.synonymBoost ?? 1.1;
  const followupWindowSeconds = memoryCfg?.followupWindowSeconds ?? 60;

  const candidates: ExpandedCandidate[] = [];
  const seen = new Set<string>();

  function add(t: string, reason: CandidateReason, weight: number): void {
    const key = t.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    candidates.push({ text: t.trim(), reason, weight });
  }

  add(text, 'original', 1.0);

  const pluralText = pluralNormalize(text);
  if (pluralText !== text) add(pluralText, 'plural', 1.05);

  let synonymCount = 0;
  for (const [fromPhrase, toPhrases] of Object.entries(synonymMap)) {
    const fromNorm = fromPhrase.trim().toLowerCase();
    if (!fromNorm || !text.toLowerCase().includes(fromNorm)) continue;
    const toArr = Array.isArray(toPhrases) ? toPhrases : [toPhrases];
    for (const toPhrase of toArr) {
      if (synonymCount >= MAX_SYNONYM_CANDIDATES) break;
      const toStr = typeof toPhrase === 'string' ? toPhrase : String(toPhrase);
      const expanded = text.replace(new RegExp(escapeRegex(fromPhrase), 'gi'), toStr);
      if (expanded !== text) {
        add(expanded, 'synonym', synonymBoost);
        synonymCount += 1;
      }
    }
    if (synonymCount >= MAX_SYNONYM_CANDIDATES) break;
  }

  const last = memory.lastResult;
  const withinWindow = memory.isWithinWindow(followupWindowSeconds);
  if (memoryCfg?.enabled !== false && last && withinWindow) {
    const tokens = text.split(/\s+/).filter(Boolean);
    const isShort = tokens.length <= 4;
    const hasPrefix = FOLLOWUP_PREFIXES.some((p) => text.toLowerCase().startsWith(p));
    if ((isShort || hasPrefix) && last.screenId) {
      const hint = last.screenId.toLowerCase();
      const followUpText = `${text} ${hint}`.trim();
      add(followUpText, 'memory', followupBoost);
    }
  }

  const sorted = [...candidates].sort((a, b) => b.weight - a.weight);
  console.log(
    `[Navoice][SpecContext] candidates=${sorted.map((c) => `${c.reason}(w=${c.weight}) '${c.text}'`).join(' | ')}`
  );
  return sorted;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get relatedBoost for a task given last result (for application in pipeline, not here).
 */
export function getRelatedBoost(
  ctx: RuntimeSpecContext | undefined,
  lastTaskId: string | null,
  currentTaskId: string
): number {
  if (!lastTaskId || !ctx?.relatedIntents) return 1;
  const related = ctx.relatedIntents[lastTaskId];
  if (!Array.isArray(related) || !related.includes(currentTaskId)) return 1;
  return ctx.memory?.relatedBoost ?? 1.15;
}
