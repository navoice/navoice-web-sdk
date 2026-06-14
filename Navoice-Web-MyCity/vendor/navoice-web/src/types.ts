/**
 * Choice item when backend returns show_choices.
 */
export interface NavoiceChoice {
  taskId: string;
  title: string;
  confidence: number;
  screenId: string | null;
  params: Record<string, string> | null;
}

/** Per-step durations (ms) for pipeline summary. */
export interface PipelineTimings {
  stt?: number;
  normalize?: number;
  local?: number;
  semantic?: number;
  cloud?: number;
  total?: number;
}

/**
 * Base result variants from routing (text or voice).
 * execute/present include taskId for parity with iOS.
 * traceId optional for debug logging.
 */
export type NavoiceResultBase =
  | { kind: 'execute'; screenId: string; params: Record<string, string>; say: string; confidence: number | null; taskId?: string; traceId?: string }
  | { kind: 'present'; presentationId: string; params: Record<string, string>; say: string; confidence: number | null; taskId?: string; traceId?: string }
  | { kind: 'showChoices'; say: string; choices: NavoiceChoice[]; traceId?: string }
  | { kind: 'unsupported'; say: string; traceId?: string }
  | { kind: 'planRestricted'; reason: string; requiredPlan: string; say?: string; traceId?: string };

/**
 * Result of routing user input (text or voice).
 * When using routeAudio(), sttUsed and timings are set on the returned result.
 */
export type NavoiceResult = NavoiceResultBase & {
  /** True when the input was produced by built-in STT (e.g. routeAudio). */
  sttUsed?: boolean;
  /** Pipeline step durations (ms). Present when STT was used or when debug is enabled. */
  timings?: PipelineTimings;
};

/**
 * Audit events for verifying voice pipeline behavior.
 */
export type NavoiceAuditEvent =
  | { type: 'licenseValidateRequested'; publishableKey: string; appId: string }
  | { type: 'licenseValidated'; projectId: string | null; expiresAtISO: string | null }
  | { type: 'licenseValidateFailed'; message: string }
  | { type: 'localSTTUsed'; transcriptLength: number }
  | { type: 'cloudSTTRequested'; audioBytes: number }
  | { type: 'cloudSTTUsed'; transcriptLength: number }
  | { type: 'cloudSTTFailed'; message: string };
