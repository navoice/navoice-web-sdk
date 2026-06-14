import { NavoiceClient, type TranscribeSttOptions, NavoiceHttpError } from '../NavoiceClient';

export interface CloudSTTProvider {
  transcribe(audioBlob: Blob, locale: string, stt?: TranscribeSttOptions, traceId?: string): Promise<string>;
}

export class BackendCloudSTTProvider implements CloudSTTProvider {
  constructor(
    private readonly client: NavoiceClient,
    private readonly getToken: (force?: boolean) => Promise<string>
  ) {}

  async transcribe(audioBlob: Blob, locale: string, stt?: TranscribeSttOptions, traceId?: string): Promise<string> {
    const token = await this.getToken(false);
    try {
      return await this.client.transcribeAudio(audioBlob, locale, token, stt, traceId);
    } catch (err) {
      if (err instanceof NavoiceHttpError && err.status === 401) {
        // Token may have expired between calls; force license re-validation once, then retry once.
        const originalErr = err;
        try {
          const newToken = await this.getToken(true);
          return await this.client.transcribeAudio(audioBlob, locale, newToken, stt, traceId);
        } catch {
          throw originalErr;
        }
      }
      throw err;
    }
  }
}
