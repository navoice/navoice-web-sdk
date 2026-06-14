/**
 * Tests for routeAudio and backward compatibility of route(text).
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Navoice } from './Navoice';
import type { NavoiceResult } from './types';

const MINIMAL_SPEC = {
  app: { default_locale: 'en-US' },
  tasks: [],
  routing: { stopwords: [], thresholds: { stopwordsByLocale: {} } },
};

describe('route(text) backward compatibility', () => {
  it('returns unsupported for empty string without calling network', async () => {
    const navoice = new Navoice({
      publishableKey: 'pk_test',
      spec: MINIMAL_SPEC,
      baseURL: 'https://test.example.com',
    });
    const result = await navoice.route('');
    expect(result.kind).toBe('unsupported');
    expect((result as { say?: string }).say).toBeDefined();
  });

  it('returns a result with kind and optional traceId', async () => {
    const navoice = new Navoice({
      publishableKey: 'pk_test',
      spec: MINIMAL_SPEC,
      baseURL: 'https://test.example.com',
    });
    const result = await navoice.route('  ');
    expect(result.kind).toBe('unsupported');
    const r = result as NavoiceResult;
    expect(['execute', 'present', 'showChoices', 'unsupported']).toContain(r.kind);
  });
});

describe('routeAudio', () => {
  const baseURL = 'https://test.example.com';

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string | URL, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.toString();
        if (u.includes('/api/license/validate')) {
          return Promise.resolve(
            new Response(JSON.stringify({ ok: true, token: 'mock-token', expires_at: '2030-01-01T00:00:00Z' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        if (u.includes('/api/stt')) {
          return Promise.resolve(
            new Response(JSON.stringify({ text: 'open education' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return Promise.reject(new Error(`Unexpected fetch: ${u}`));
      })
    );
  });

  it('returns result with sttUsed true and timings.stt when STT succeeds', async () => {
    const navoice = new Navoice({
      publishableKey: 'pk_test',
      spec: MINIMAL_SPEC,
      baseURL,
      appId: 'https://example.com',
    });
    const blob = new Blob([new Uint8Array(100)], { type: 'audio/webm' });
    const result = await navoice.routeAudio(blob, { locale: 'en-US' });
    expect(result.sttUsed).toBe(true);
    expect(result.timings).toBeDefined();
    expect(typeof result.timings?.stt).toBe('number');
    expect((result.timings?.stt ?? 0) >= 0).toBe(true);
    expect(['execute', 'present', 'showChoices', 'unsupported']).toContain(result.kind);
  });

  it('returns sttUsed true and timings for empty blob (no network STT)', async () => {
    const navoice = new Navoice({
      publishableKey: 'pk_test',
      spec: MINIMAL_SPEC,
      baseURL,
      appId: 'https://example.com',
    });
    const blob = new Blob([], { type: 'audio/webm' });
    const result = await navoice.routeAudio(blob);
    expect(result.sttUsed).toBe(true);
    expect(result.timings).toBeDefined();
    expect(result.kind).toBe('unsupported');
  });
});

describe('plan_restricted mode — F-002', () => {
  const baseURL = 'https://test.example.com';

  function makeFetchWithInterpretResponse(interpretBody: object) {
    return vi.fn((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/api/license/validate')) {
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true, token: 'mock-token', expires_at: '2030-01-01T00:00:00Z' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (u.includes('/api/interpret')) {
        return Promise.resolve(
          new Response(JSON.stringify(interpretBody), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.reject(new Error(`Unexpected fetch: ${u}`));
    });
  }

  it('T-W-01: plan_restricted response maps to kind planRestricted', async () => {
    vi.stubGlobal('fetch', makeFetchWithInterpretResponse({
      mode: 'plan_restricted',
      type: 'plan_restricted',
      screenId: null,
      params: {},
      reason: 'catalog_requires_paid_plan',
      requiredPlan: 'Growth',
    }));

    const navoice = new Navoice({
      publishableKey: 'pk_test',
      spec: MINIMAL_SPEC,
      baseURL,
      appId: 'https://example.com',
    });
    const result = await navoice.route('find coffee shop');
    expect(result.kind).toBe('planRestricted');
  });

  it('T-W-02: reason and requiredPlan are preserved on planRestricted result', async () => {
    vi.stubGlobal('fetch', makeFetchWithInterpretResponse({
      mode: 'plan_restricted',
      reason: 'catalog_requires_paid_plan',
      requiredPlan: 'Growth',
    }));

    const navoice = new Navoice({
      publishableKey: 'pk_test',
      spec: MINIMAL_SPEC,
      baseURL,
      appId: 'https://example.com',
    });
    const result = await navoice.route('find coffee shop');
    expect(result.kind).toBe('planRestricted');
    if (result.kind === 'planRestricted') {
      expect(result.reason).toBe('catalog_requires_paid_plan');
      expect(result.requiredPlan).toBe('Growth');
    }
  });

  it('T-W-03: unsupported response still returns kind unsupported (regression)', async () => {
    vi.stubGlobal('fetch', makeFetchWithInterpretResponse({
      mode: 'unsupported',
      say: 'Sorry, I did not understand that.',
    }));

    const navoice = new Navoice({
      publishableKey: 'pk_test',
      spec: MINIMAL_SPEC,
      baseURL,
      appId: 'https://example.com',
    });
    const result = await navoice.route('zzzzz gibberish');
    expect(result.kind).toBe('unsupported');
  });

  it('T-W-04: execute response still returns kind execute (regression)', async () => {
    vi.stubGlobal('fetch', makeFetchWithInterpretResponse({
      mode: 'execute',
      screenId: 'home',
      params: {},
      say: 'Going home.',
      task: { id: 'go.home', confidence: 0.9 },
    }));

    const navoice = new Navoice({
      publishableKey: 'pk_test',
      spec: MINIMAL_SPEC,
      baseURL,
      appId: 'https://example.com',
    });
    const result = await navoice.route('go home');
    expect(result.kind).toBe('execute');
  });
});
