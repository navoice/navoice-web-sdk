/**
 * LocalRouter – parity with iOS LocalRouter.
 * Runs before cloud; uses thresholds from runtime spec.
 * Input text is expected to be already normalized (main Normalizer); we apply internal normalize for scoring consistency.
 */

import type { NavoiceResult, NavoiceChoice } from './types';
import type { RuntimeSpec, RuntimeSpecThresholds, RuntimeSpecTask } from './runtimeSpec';

const DEFAULT_THRESHOLDS: RuntimeSpecThresholds = {
  execute_min_score: 6.0,
  execute_min_conf: 0.75,
  choices_min_score: 3.0,
  choices_min_conf: 0.45,
  close_to_second_delta: 2.0,
  max_choices: 4,
};

// English weak words for LocalRouter-internal filtering (parity with iOS LocalRouter stopword set)
const STOPWORDS = new Set([
  'i', 'you', 'he', 'she', 'we', 'they', 'them', 'us',
  'need', 'needs', 'want', 'wants', 'wanting',
  'saw', 'have', 'in', 'on', 'of', 'this', 'that',
  'street', 'home', 'later', 'here', 'there', 'today', 'tomorrow',
]);

function internalNormalize(s: string): string {
  let t = s.trim().toLowerCase();
  t = t.replace(/[\u05F4"]/g, '').replace(/'/g, '').replace(/`/g, '');
  t = t.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  return t;
}

function tokenize(textNorm: string): string[] {
  return textNorm
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !STOPWORDS.has(w));
}

function keywordMatchScore(textNorm: string, keyword: string): number {
  const kn = internalNormalize(keyword);
  if (!kn) return 0;
  const parts = kn.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    const ok = parts.every((p) => textNorm.includes(p));
    return ok ? 6 : 0;
  }
  return textNorm.includes(kn) ? 3 : 0;
}

function exampleSimilarityScore(textNorm: string, example: string): number {
  const en = internalNormalize(example);
  if (!en) return 0;
  const tokens = tokenize(en);
  if (tokens.length === 0) return 0;
  const hits = tokens.filter((t) => textNorm.includes(t)).length;
  return Math.min(3, hits * 0.6);
}

function scoreTask(textNorm: string, task: RuntimeSpecTask): number {
  let score = 0;
  for (const k of task.keywords) score += keywordMatchScore(textNorm, k);
  for (const ex of task.examples) score += exampleSimilarityScore(textNorm, ex);
  return score;
}

function toConfidence(score: number): number {
  const s = Math.max(0, score);
  const conf = 1 - Math.exp(-s / 4.5);
  return Math.min(1, Math.max(0, conf));
}

export function routeLocal(
  text: string,
  spec: RuntimeSpec,
  thresholds: RuntimeSpecThresholds | null,
  debug?: boolean
): NavoiceResult {
  const EXECUTE_MIN_SCORE = thresholds?.execute_min_score ?? DEFAULT_THRESHOLDS.execute_min_score;
  const EXECUTE_MIN_CONF = thresholds?.execute_min_conf ?? DEFAULT_THRESHOLDS.execute_min_conf;
  const CHOICES_MIN_SCORE = thresholds?.choices_min_score ?? DEFAULT_THRESHOLDS.choices_min_score;
  const CHOICES_MIN_CONF = thresholds?.choices_min_conf ?? DEFAULT_THRESHOLDS.choices_min_conf;
  const closeToSecondDelta = thresholds?.close_to_second_delta ?? DEFAULT_THRESHOLDS.close_to_second_delta;
  const maxChoices = thresholds?.max_choices ?? DEFAULT_THRESHOLDS.max_choices;

  const t = internalNormalize(text);
  if (!t) {
    if (debug) logLocalFirst(0, 0, 'fallback');
    return { kind: 'unsupported', say: 'Type or say something 🙂' };
  }

  const tasks = spec.tasksRaw ?? spec.tasks ?? [];
  const scored: { task: RuntimeSpecTask; score: number; conf: number }[] = tasks.map((task) => {
    const s = scoreTask(t, task);
    return { task, score: s, conf: toConfidence(s) };
  });
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top) {
    if (debug) logLocalFirst(0, 0, 'fallback');
    return { kind: 'unsupported', say: 'No matching screen found. Try rephrasing 🙂' };
  }

  const second = scored[1];

  if (top.score <= 0 || top.score < CHOICES_MIN_SCORE || top.conf < CHOICES_MIN_CONF) {
    if (debug) logLocalFirst(top.score, top.conf, 'fallback');
    return { kind: 'unsupported', say: 'No matching screen found. Try rephrasing 🙂' };
  }

  const closeToSecond = second != null && top.score - second.score < closeToSecondDelta;
  const canExecute = top.score >= EXECUTE_MIN_SCORE && top.conf >= EXECUTE_MIN_CONF;

  if (!canExecute || closeToSecond) {
    if (debug) logLocalFirst(top.score, top.conf, 'choices');
    const say = "I'm not sure what you meant. Here are a few options:";
    const choicesArray: NavoiceChoice[] = scored
      .slice(0, Math.max(1, maxChoices))
      .filter((x) => x.score > 0)
      .map((item) => ({
        taskId: item.task.id,
        title: item.task.title,
        confidence: Math.round(item.conf * 100) / 100,
        screenId: item.task.screenId,
        params: item.task.defaultParams ?? {},
      }));
    if (choicesArray.length === 0) {
      if (debug) logLocalFirst(top.score, top.conf, 'fallback');
      return { kind: 'unsupported', say: 'No matching screen found. Try rephrasing 🙂' };
    }
    return { kind: 'showChoices', say, choices: choicesArray };
  }

  const say = `Navigating to: ${top.task.title}`;
  const params = top.task.defaultParams ?? {};
  const confidence = Math.round(top.conf * 100) / 100;
  const act = top.task.action;

  if (debug) {
    console.log('[Navoice][LocalRouter] topTask', {
      id: top.task.id,
      title: top.task.title,
      screenId: top.task.screenId,
      action: top.task.action,
    });
  }

  if (act?.type === 'present') {
    const pid = (act.id ?? '').trim();
    if (pid) {
      if (debug) logLocalFirst(top.score, top.conf, 'execute');
      return {
        kind: 'present',
        presentationId: pid,
        params,
        say,
        confidence,
        taskId: top.task.id,
      };
    }
  }

  const screenId = (act?.screenId?.trim() && act?.screenId) || top.task.screenId;
  if (debug) logLocalFirst(top.score, top.conf, 'execute');
  return {
    kind: 'execute',
    screenId,
    params,
    say,
    confidence,
    taskId: top.task.id,
  };
}

function logLocalFirst(score: number, conf: number, decision: 'execute' | 'choices' | 'fallback'): void {
  console.log(`[Navoice][LocalFirst] score=${score} conf=${conf} decision=${decision}`);
}
