import type { NavoiceChoice } from './types';

const PREFIX = 'navoice.learn';

function key(appId: string, screenId: string): string {
  return `${PREFIX}.${appId}.${screenId}`;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const LearningStore = {
  recordChoice(appId: string, screenId: string): void {
    const storage = getStorage();
    if (!storage) return;
    const k = key(appId, screenId);
    const current = parseInt(storage.getItem(k) ?? '0', 10);
    storage.setItem(k, String(current + 1));
  },

  boost(appId: string, choices: NavoiceChoice[]): NavoiceChoice[] {
    const storage = getStorage();
    return choices
      .map((c) => {
        const sid = c.screenId ?? '__no_screen__';
        let count = 0;
        if (storage) {
          count = parseInt(storage.getItem(key(appId, sid)) ?? '0', 10);
        }
        const extra = Math.min(0.15, count * 0.03);
        return {
          ...c,
          confidence: Math.min(1, c.confidence + extra),
        };
      })
      .sort((a, b) => b.confidence - a.confidence);
  },
};
