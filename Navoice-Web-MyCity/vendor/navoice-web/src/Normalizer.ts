/**
 * Normalizer – single-pass, deterministic text normalization.
 * No recursive processing, no re-processing own output, no token duplication.
 * Used for local routing, semantic resolve, and cloud interpret.
 */

const MAX_TOKENS = 24;

export interface NormalizedCommand {
  originalText: string;
  normalizedText: string;
  locale: string | null;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Single-pass normalization. Never appends to or re-processes its own output.
 * Step 1: Lowercase
 * Step 2: Remove punctuation (keep letters + numbers)
 * Step 3: Apply replacements (one pass, whole-word only)
 * Step 4: Split into tokens
 * Step 5: Remove stopwords
 * Step 6: Remove consecutive duplicate tokens
 * Step 7: Limit max tokens to 24
 * Step 8: Join back into a single string
 */
export function normalize(
  text: string,
  locale: string | null,
  stopwords: string[],
  replacements?: Record<string, string> | null
): NormalizedCommand {
  console.log('[DEBUG][NORMALIZER HIT] normalize() called');
  if (!text || typeof text !== 'string') {
    return { originalText: text ?? '', normalizedText: '', locale };
  }

  const raw = text.trim();
  if (!raw) {
    return { originalText: text, normalizedText: '', locale };
  }

  // Step 1: Lowercase
  const lower = raw.toLowerCase();

  // Step 2: Remove punctuation (keep letters + numbers), collapse spaces
  let cleaned = lower
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Step 3: Replacements (single pass, whole-word only)
  const replMap = replacements && Object.keys(replacements).length > 0 ? replacements : null;
  if (replMap) {
    for (const [from, to] of Object.entries(replMap)) {
      if (from === '' || typeof to !== 'string') continue;
      const re = new RegExp(`\\b${escapeRegExp(from)}\\b`, 'gi');
      cleaned = cleaned.replace(re, to);
    }
  }

  // Step 4: Split into tokens
  const stopwordsSet = new Set(stopwords.map((s) => s.toLowerCase().trim()).filter(Boolean));

  console.log('[DEBUG][STOPWORDS ACTIVE]', Array.from(stopwords ?? []).slice(0, 20));

  // Step 5: Remove stopwords
  const tokens = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !stopwordsSet.has(t.toLowerCase()));

  // Step 6: Remove consecutive duplicate tokens
  const deduped: string[] = [];
  for (const t of tokens) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== t) {
      deduped.push(t);
    }
  }

  // Step 7: Cap at MAX_TOKENS
  const capped = deduped.slice(0, MAX_TOKENS);

  // Step 8: Join
  const normalizedText = capped.join(' ');

  return { originalText: text, normalizedText, locale };
}
