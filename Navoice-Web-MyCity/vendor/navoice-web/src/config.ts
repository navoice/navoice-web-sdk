export type NavoiceSTTMode = 'localOnly' | 'cloudOnly' | 'hybrid' | 'disabled';

export const NavoiceSTTConfig = {
  localOnly: { mode: 'localOnly' as const, cloudFallbackEnabled: false },
  cloudOnly: { mode: 'cloudOnly' as const, cloudFallbackEnabled: true },
  hybrid: { mode: 'hybrid' as const, cloudFallbackEnabled: true },
  disabled: { mode: 'disabled' as const, cloudFallbackEnabled: false },
} as const;

export type NavoiceSTTConfig = (typeof NavoiceSTTConfig)[keyof typeof NavoiceSTTConfig];
