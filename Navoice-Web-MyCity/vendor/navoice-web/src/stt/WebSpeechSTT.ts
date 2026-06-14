/**
 * Browser SpeechRecognition-based STT. Mirrors iOS local STT behavior.
 */

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onaudiostart?: () => void;
  onspeechend?: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(i: number): SpeechRecognitionResult;
  [i: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(i: number): SpeechRecognitionAlternative;
  [i: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface WebSpeechSTTOptions {
  locale: string;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onAudioChunk?: (blob: Blob) => void;
}

export class WebSpeechSTT {
  private recognition: SpeechRecognitionInstance | null = null;
  private readonly locale: string;
  private readonly onTranscript?: (transcript: string, isFinal: boolean) => void;
  private readonly onAudioChunk?: (blob: Blob) => void;
  private bestTranscript = '';
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  constructor(options: WebSpeechSTTOptions) {
    this.locale = options.locale;
    this.onTranscript = options.onTranscript;
    this.onAudioChunk = options.onAudioChunk;
  }

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const C = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    return typeof C === 'function';
  }

  get isAuthorized(): boolean {
    return true; // We'll check on first start via getInputStream
  }

  get bestTranscriptResult(): string {
    return this.bestTranscript;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  start(): void {
    const C = typeof window !== 'undefined' ? (window.SpeechRecognition ?? window.webkitSpeechRecognition) : undefined;
    if (!C) return;

    this.bestTranscript = '';
    this.audioChunks = [];

    this.recognition = new C();
    this.recognition.continuous = false;
this.recognition.interimResults = false;
(this.recognition as any).maxAlternatives = 1;
this.recognition.lang = this.locale || "en-US";
    this.recognition.onresult = (e: SpeechRecognitionEvent) => {
      let best = '';
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        const alt = result[0];
        if (alt?.transcript) {
          best = alt.transcript;
          if (result.isFinal) {
            this.bestTranscript = (this.bestTranscript + ' ' + best).trim();
            this.onTranscript?.(this.bestTranscript, true);
          } else {
            this.onTranscript?.(this.bestTranscript + ' ' + best, false);
          }
        }
      }
      if (best && !e.results[e.resultIndex]?.isFinal) {
        this.bestTranscript = (this.bestTranscript + ' ' + best).trim();
      }
    };
    this.recognition.onend = () => {};
    this.recognition.onerror = () => {};
    this.recognition.start();

    this.startRecordingAudio();
  }

  stop(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    this.stopRecordingAudio();
  }

  /** After stop(), wait briefly for final chunks then return recorded audio blob (for cloud STT fallback). */
  async waitForAudioBlob(timeoutMs: number): Promise<Blob | null> {
    await new Promise((r) => setTimeout(r, Math.min(300, timeoutMs)));
    if (this.audioChunks.length === 0) return null;
    const type = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
    return new Blob(this.audioChunks, { type });
  }

  private async startRecordingAudio(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.start(100);
    } catch {
      this.stream = null;
      this.mediaRecorder = null;
    }
  }

  private stopRecordingAudio(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
}
