/**
 * Per-session memory for follow-up intent (last executed task/screen).
 * Parity with iOS SessionMemory.
 */

import type { NavoiceResult } from './types';

export interface LastResult {
  taskId: string | null;
  screenId: string | null;
  timestamp: number;
}

class SessionMemoryImpl {
  private last: LastResult | null = null;

  get lastResult(): LastResult | null {
    return this.last;
  }

  update(from: NavoiceResult): void {
    switch (from.kind) {
      case 'execute':
        this.last = {
          taskId: from.taskId ?? null,
          screenId: from.screenId,
          timestamp: Date.now(),
        };
        break;
      case 'present':
        this.last = {
          taskId: from.taskId ?? null,
          screenId: from.presentationId,
          timestamp: Date.now(),
        };
        break;
      case 'showChoices':
      case 'unsupported':
        break;
    }
  }

  isWithinWindow(seconds: number): boolean {
    if (!this.last) return false;
    return (Date.now() - this.last.timestamp) / 1000 <= seconds;
  }
}

export const SessionMemory = new SessionMemoryImpl();
