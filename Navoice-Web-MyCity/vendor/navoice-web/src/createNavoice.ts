/**
 * createNavoice – factory for Web SDK with mic binding, badge, and navigation.
 * The SDK owns: mic click handling, audio recording, STT/interpret flow, emitting results, and navigation.
 */

import { Navoice } from './Navoice';
import { NavoiceClient } from './NavoiceClient';
import type { NavoiceResult } from './types';
import { NAVOICE_SDK_VERSION } from './version';
import type { NavoiceSTTConfig } from './config';
import { NavoiceSTTConfig as STTConfig } from './config';

type MicState = 'idle' | 'listening' | 'thinking';

export interface CreateNavoiceMount {
  micButton: string;
  badge?: string;
  licenseBanner?: string;
}

export interface CreateNavoiceNavigation {
  mode: 'history';
  routes: Record<string, string>; // screenId -> path
  navigate?: (path: string) => void;
}

export interface CreateNavoiceOptions {
  spec: unknown;
  publishableKey: string;
  backendBaseUrl?: string;
  sdkVersion?: string;
  origin?: string;
  requestTimeoutMs?: number;
  locale?: string;
  sttConfig?: NavoiceSTTConfig;
  debug?: boolean;
  mount: CreateNavoiceMount;
  navigation: CreateNavoiceNavigation;
  navigationMode?: 'auto' | 'manual';
}

export interface CreateNavoiceResult {
  init: () => Promise<void>;
  navoice: Navoice;
}

/**
 * Create a Navoice instance with mic binding, badge updates, and history navigation.
 */
export function createNavoice(options: CreateNavoiceOptions): CreateNavoiceResult {
  const {
    spec,
    publishableKey,
    backendBaseUrl = 'https://api.navoice.io',
    sdkVersion = NAVOICE_SDK_VERSION,
    origin,
    locale,
    sttConfig = STTConfig.localOnly,
    debug,
    mount,
    navigation,
    navigationMode = 'auto',
  } = options;

  const debugFlag =
    debug ?? (typeof window !== 'undefined' && !!(window as unknown as { __NAVOICE_DEBUG__?: boolean }).__NAVOICE_DEBUG__) ?? false;

  const appId = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'web');
  const defaultLocale =
    locale ??
    (typeof spec === 'object' && spec !== null && 'app' in spec && typeof (spec as { app?: { default_locale?: string } }).app?.default_locale === 'string'
      ? (spec as { app: { default_locale: string } }).app.default_locale
      : 'en-US');

  const navoice = new Navoice({
    baseURL: backendBaseUrl.replace(/\/$/, ''),
    publishableKey,
    spec,
    locale: defaultLocale,
    appId,
    sttConfig,
    debug: debugFlag,
  });

  let micState: MicState = 'idle';
  let badgeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  function setMicState(state: MicState): void {
    if (typeof document === 'undefined') return;
    micState = state;
    const el = document.querySelector(mount.micButton);
    if (el instanceof HTMLElement) {
      el.setAttribute('data-navoice-mic-state', state);
      el.setAttribute('aria-label', state === 'idle' ? 'Tap to start listening' : state === 'listening' ? 'Tap to stop and process' : 'Processing');
    }
  }

  function showBadge(color: 'success' | 'fail', durationMs: number): void {
    if (typeof document === 'undefined' || !mount.badge) return;
    const el = document.querySelector(mount.badge);
    if (el instanceof HTMLElement) {
      el.setAttribute('data-navoice-badge', color);
      el.setAttribute('aria-hidden', 'false');
      if (badgeTimeoutId) clearTimeout(badgeTimeoutId);
      badgeTimeoutId = setTimeout(() => {
        el.removeAttribute('data-navoice-badge');
        el.setAttribute('aria-hidden', 'true');
        badgeTimeoutId = null;
      }, durationMs);
    }
  }

  function hideLicenseBanner(): void {
    if (typeof document === 'undefined' || !mount.licenseBanner) return;
    const el = document.querySelector(mount.licenseBanner);
    if (el instanceof HTMLElement) el.style.display = 'none';
  }

  function showLicenseBanner(): void {
    if (typeof document === 'undefined' || !mount.licenseBanner) return;
    const el = document.querySelector(mount.licenseBanner);
    if (el instanceof HTMLElement) {
      el.textContent = 'License not active';
      el.style.display = 'block';
    }
  }

  function navigateTo(screenId: string, params?: Record<string, string>): void {
    const id = screenId.trim().toLowerCase();
    const path = navigation.routes[id];
    console.log('[NAVOICE] navigateTo', { screenId, id, path, hasNavigateFn: !!navigation.navigate, routes: navigation.routes });
    if (path) {
      if (navigation.navigate) {
        const qs = params && Object.keys(params).length > 0
          ? '?' + new URLSearchParams(params).toString()
          : '';
        navigation.navigate(path + qs);
      } else if (typeof window !== 'undefined' && typeof window.history !== 'undefined') {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  }

  function bindMicButton(): void {
    if (typeof document === 'undefined') return;
    const el = document.querySelector(mount.micButton);
    if (!(el instanceof HTMLElement)) return;

    el.addEventListener('click', () => {
      console.log('[NAVOICE] mic clicked, state=', micState);
    
      try {
        switch (micState) {
          case 'idle':
            setMicState('listening');
            navoice.startVoice();
            break;
          case 'listening':
            setMicState('thinking');
            navoice.stopVoice();
            break;
          case 'thinking':
            break;
        }
      } catch (e) {
        console.error('[NAVOICE] mic click error', e);
        setMicState('idle');
      }
    });

    el.setAttribute('data-navoice-mic-state', 'idle');
  }

  navoice.onResult = (result: NavoiceResult) => {
    setMicState('idle');

    switch (result.kind) {
      case 'execute':
        showBadge('success', 1500);
        if (navigationMode === 'auto') {
          navigateTo(result.screenId, result.params);
        }
        break;
      case 'present':
        showBadge('success', 1500);
        if (navigationMode === 'auto') {
          navigateTo(result.presentationId, result.params);
        }
        break;
      case 'unsupported':
        showBadge('fail', 5000);
        break;
      case 'showChoices':
        showBadge('fail', 5000);
        break;
      case 'planRestricted':
        showBadge('fail', 5000);
        break;
    }
  };

  async function init(): Promise<void> {
    bindMicButton();

    if (mount.badge) {
      const el = document.querySelector(mount.badge);
      if (el instanceof HTMLElement) el.setAttribute('aria-hidden', 'true');
    }

    if (sttConfig === STTConfig.localOnly) {
      hideLicenseBanner();
      return;
    }
    
    const client = new NavoiceClient(backendBaseUrl.replace(/\/$/, ''));
    try {
      await client.validateWebLicense(publishableKey, appId, sdkVersion);
      hideLicenseBanner();
    } catch {
      showLicenseBanner();
    }
  }

  return { init, navoice };
}
