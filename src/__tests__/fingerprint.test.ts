import { afterEach, describe, expect, it, vi } from 'vitest';
import { Fingerprint, createFingerprinter } from '../fingerprint';
import { VERSION, FingerprintError } from '../types';
import type { CollectorContext, ComponentCollector, FingerprintOptions } from '../types';

function collector(
  name: string,
  collect: ComponentCollector['collect'] = () => name,
): ComponentCollector {
  return {
    name,
    collect,
    metadata: { name, stable: false, category: 'browser' },
    isSupported: () => true,
  };
}
const generate = (options: FingerprintOptions = {}) =>
  Fingerprint.generate({ collectors: [], ...options });
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('public selection and results', () => {
  it('exposes 19 descriptors and a network-free default selection', async () => {
    expect(Fingerprint.getAvailableCollectors()).toHaveLength(19);
    const metadata = Fingerprint.getCollectorMetadata();
    expect(metadata.find((value) => value.name === 'webrtc')).toMatchObject({
      network: true,
      profiles: [],
    });
    const result = await generate({ profile: 'minimal', collectors: undefined });
    expect(result.collectorResults.webrtc.status).toBe('excluded');
    expect(result.collectorResults.audio.status).toBe('excluded');
    expect(result.version).toBe(VERSION);
    expect(Fingerprint.getVersion()).toBe(VERSION);
    expect(result.entropy).toBeNull();
    expect(result.confidence).toBe(result.collectionCoverage);
    metadata[0].profiles.push('minimal');
    expect(Fingerprint.getCollectorMetadata()[0].profiles).not.toContain('minimal');
  });
  it('handles zero collectors honestly and never returns NaN', async () => {
    const result = await generate();
    expect(result.collectionCoverage).toBe(0);
    expect(result.quality).toBe('empty');
    const redacted = await generate({ includeComponents: false });
    expect(redacted.components).toEqual({});
    expect(redacted.quality).toBe('empty');
    expect(
      Object.values(result.collectorResults).every((value) => value.status === 'excluded'),
    ).toBe(true);
  });
  it('honors exact selection and old exclusions', async () => {
    const result = await generate({ collectors: ['userAgent', 'language'], excludeLanguage: true });
    expect(result.components.userAgent).toBe(navigator.userAgent);
    expect(result.collectorResults.language.status).toBe('excluded');
    expect(result.collectionCoverage).toBe(100);
  });
  it('supports isolated custom observations and reports unsupported separately', async () => {
    const unsupported = collector('unsupported');
    unsupported.isSupported = () => false;
    const result = await generate({ customCollectors: [collector('valid'), unsupported] });
    expect(result.components.valid).toBe('valid');
    expect(result.components.unsupported).toBeUndefined();
    expect(result.collectorResults.unsupported.status).toBe('unsupported');
    expect(result.collectionCoverage).toBe(50);
  });
  it('does not count legacy sentinels as success', async () => {
    const result = await generate({
      customCollectors: [
        collector('batteryLegacy', () => ({ supported: false })),
        collector('canvasLegacy', () => 'no-canvas-context'),
      ],
    });
    expect(result.collectionCoverage).toBe(0);
    expect(result.collectorResults.batteryLegacy.status).toBe('unsupported');
    expect(result.collectorResults.canvasLegacy.status).toBe('unsupported');
  });
  it('maps thrown values, native policy errors and structured errors', async () => {
    const result = await generate({
      customCollectors: [
        collector('stringError', () => {
          throw 'failure';
        }),
        collector('blocked', () => {
          throw new DOMException('Policy denied', 'NotAllowedError');
        }),
        collector('unavailable', () => {
          throw new FingerprintError('Missing', 'UNSUPPORTED');
        }),
      ],
    });
    expect(result.collectorResults.stringError).toMatchObject({
      status: 'error',
      reason: 'failure',
    });
    expect(result.collectorResults.blocked.status).toBe('blocked');
    expect(result.collectorResults.unavailable.status).toBe('unsupported');
  });
  it('blocks explicit WebRTC selection until network is enabled', async () => {
    const peer = vi.fn();
    vi.stubGlobal('RTCPeerConnection', peer);
    const result = await generate({ collectors: ['webrtc'] });
    expect(result.collectorResults.webrtc.status).toBe('blocked');
    expect(peer).not.toHaveBeenCalled();
  });
  it('uses a pure snapshot for optional analysis', async () => {
    const result = await generate({ collectors: ['userAgent'], includeSuspectAnalysis: true });
    expect(result.components.automation).toBeDefined();
    expect(result.suspectAnalysis?.rulesVersion).toBe('3.0.0');
    expect(result.suspectAnalysis?.signals.map((value) => value.type)).not.toContain('too_perfect');
  });
  it('shares collection behavior with getComponents', async () => {
    const collect = vi.fn(() => 'value');
    const fp = createFingerprinter({
      collectors: [],
      customCollectors: [collector('fixture', collect)],
      customData: { userId: 'uuid' },
    });
    expect(await fp.getComponents()).toEqual({ fixture: 'value', custom: { userId: 'uuid' } });
    expect((await fp.generate()).components).toEqual({
      fixture: 'value',
      custom: { userId: 'uuid' },
    });
    expect(collect).toHaveBeenCalledTimes(2);
  });
});

describe('deadlines, cancellation and lifecycle', () => {
  it.each(['collect', 'validation', 'snapshot', 'project', 'projection snapshot'] as const)(
    'rejects synchronous work exceeding its local deadline during %s before timers run',
    async (phase) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      let clock = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => clock);
      const lateValue = (): Record<string, unknown> => ({
        get stable() {
          clock = 30;
          return 'late';
        },
      });
      const late = collector('late', () => {
        if (phase === 'collect') clock = 30;
        if (phase === 'snapshot') return lateValue();
        if (phase === 'validation') {
          return Object.defineProperty({ stable: 'late' }, 'error', {
            get() {
              clock = 30;
              return undefined;
            },
          });
        }
        return { stable: 'late' };
      });
      late.project = (value) => {
        if (phase === 'project') clock = 30;
        return phase === 'projection snapshot' ? lateValue() : value;
      };
      const release = vi.fn();
      const healthy = collector('healthy', (context) => {
        context?.onCleanup(release);
        return 'healthy';
      });
      const result = await generate({
        timeout: 1,
        timeBudget: 500,
        parallel: false,
        customCollectors: [late, healthy],
      });

      // No timer advancement: elapsed synchronous work must be checked using the clock.
      expect(clock).toBe(30);
      expect(result.collectorResults.late.status).toBe('timeout');
      expect(result.collectorResults.late).not.toHaveProperty('value');
      expect(result.components).not.toHaveProperty('late');
      expect(result.hashComponents).not.toContain('late');
      expect(result.collectorResults.healthy.status).toBe('ok');
      expect(result.collectionCoverage).toBe(50);
      expect(release).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it('keeps cancellation authoritative when a synchronous projection also exceeds its deadline', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const controller = new AbortController();
    const cancelled = collector('cancelled', () => 'observation');
    cancelled.project = (value) => {
      clock = 30;
      controller.abort();
      return value;
    };
    const result = await generate({
      timeout: 1,
      timeBudget: 500,
      signal: controller.signal,
      customCollectors: [cancelled],
    });
    expect(result.collectorResults.cancelled.status).toBe('aborted');
    expect(result.components).not.toHaveProperty('cancelled');
    expect(result.hashComponents).not.toContain('cancelled');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not commit an observation or projection when a projection throws', async () => {
    const failed = collector('failed', () => ({ stable: 'observation' }));
    failed.project = () => {
      throw new Error('Projection failed');
    };
    const result = await generate({ customCollectors: [failed] });
    expect(result.collectorResults.failed).toMatchObject({
      status: 'error',
      reason: 'Projection failed',
    });
    expect(result.collectorResults.failed).not.toHaveProperty('value');
    expect(result.components).not.toHaveProperty('failed');
    expect(result.hashComponents).not.toContain('failed');
  });
  it('bounds a never-settling collector and releases registered resources', async () => {
    vi.useFakeTimers();
    const release = vi.fn();
    const fp = generate({
      timeout: 10,
      timeBudget: 100,
      customCollectors: [
        collector('pending', (context) => {
          context?.onCleanup(release);
          return new Promise(() => {});
        }),
      ],
    });
    await vi.advanceTimersByTimeAsync(11);
    const result = await fp;
    expect(result.collectorResults.pending.status).toBe('timeout');
    expect(release).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('starts concurrently only in parallel mode', async () => {
    vi.useFakeTimers();
    const order: string[] = [];
    const slow = (name: string): ComponentCollector =>
      collector(name, () => {
        order.push(name);
        return new Promise((resolve) => setTimeout(() => resolve(name), 20));
      });
    const serial = generate({ parallel: false, customCollectors: [slow('a'), slow('b')] });
    await vi.advanceTimersByTimeAsync(1);
    expect(order).toEqual(['a']);
    await vi.advanceTimersByTimeAsync(40);
    await serial;
    expect(order).toEqual(['a', 'b']);
    order.length = 0;
    const parallel = generate({ parallel: true, customCollectors: [slow('c'), slow('d')] });
    await vi.advanceTimersByTimeAsync(1);
    expect(order).toEqual(['c', 'd']);
    await vi.advanceTimersByTimeAsync(20);
    await parallel;
  });
  it('shares the global budget across serial tasks and skips remaining work', async () => {
    vi.useFakeTimers();
    const later = vi.fn(() => 'later');
    const result = generate({
      parallel: false,
      timeout: 100,
      timeBudget: 20,
      customCollectors: [
        collector('pending', () => new Promise(() => {})),
        collector('later', later),
      ],
    });
    await vi.advanceTimersByTimeAsync(21);
    const resolved = await result;
    expect(resolved.collectorResults.pending.status).toBe('timeout');
    expect(resolved.collectorResults.later.status).toBe('timeout');
    expect(later).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('returns partial results on abort and cleans listeners/timers', async () => {
    const controller = new AbortController();
    const cleanup = vi.fn();
    const promise = generate({
      signal: controller.signal,
      customCollectors: [
        collector('pending', (context) => {
          context?.onCleanup(cleanup);
          return new Promise(() => {});
        }),
      ],
    });
    await Promise.resolve();
    controller.abort();
    const result = await promise;
    expect(result.collectorResults.pending.status).toBe('aborted');
    expect(cleanup).toHaveBeenCalledOnce();
    expect(result.collectionCoverage).toBe(0);
  });
  it('does not start collectors for an already aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const work = vi.fn();
    const result = await generate({
      signal: controller.signal,
      customCollectors: [collector('fixture', work)],
    });
    expect(work).not.toHaveBeenCalled();
    expect(result.collectorResults.fixture.status).toBe('aborted');
  });
  it('cleans a resource registered by late work after a timeout', async () => {
    vi.useFakeTimers();
    const release = vi.fn();
    let pendingContext: CollectorContext | undefined;
    const promise = generate({
      timeout: 1,
      customCollectors: [
        collector('late', (context) => {
          pendingContext = context;
          return new Promise(() => {});
        }),
      ],
    });
    await vi.advanceTimersByTimeAsync(2);
    await promise;
    pendingContext?.onCleanup(release);
    expect(release).toHaveBeenCalledOnce();
  });
});

describe('input contracts', () => {
  it.each([0, -1, Infinity, NaN, 2147483648])('rejects invalid timer budget %j', (value) => {
    expect(() => new Fingerprint({ timeout: value })).toThrow();
    expect(() => new Fingerprint({ timeBudget: value })).toThrow();
  });
  it('keeps documented defaults when optional fields are explicitly undefined', async () => {
    const result = await generate({
      timeout: undefined,
      timeBudget: undefined,
      profile: undefined,
    });
    expect(result.version).toBe(VERSION);
  });
  it('rejects malformed AbortSignals before timers or collectors start', async () => {
    expect(() => new Fingerprint({ signal: {} } as unknown as FingerprintOptions)).toThrow(
      FingerprintError,
    );
    const fp = new Fingerprint({ collectors: [] });
    await expect(
      fp.generate({ signal: {} } as unknown as { signal: AbortSignal }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('does not capture new analysis data after a pre-aborted request', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await generate({ includeSuspectAnalysis: true, signal: controller.signal });
    expect(result.components.automation).toBeUndefined();
    expect(result.suspectAnalysis?.status).toBe('insufficient');
  });
  it('rejects non-JSON and circular input before collection', () => {
    expect(() => new Fingerprint({ fingerprintData: { value: 1n } })).toThrow();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => new Fingerprint({ customData: circular })).toThrow('Circular');
  });
  it.each([null, [null], [{ name: 'x', collect: () => 1, isSupported: () => true }], 'not-array'])(
    'validates JavaScript custom collectors before accessing them',
    (value) => {
      expect(
        () => new Fingerprint({ customCollectors: value } as unknown as FingerprintOptions),
      ).toThrow(FingerprintError);
    },
  );
  it('rejects duplicate and reserved custom names', () => {
    expect(() => new Fingerprint({ customCollectors: [collector('custom')] })).toThrow();
    expect(() => new Fingerprint({ customCollectors: [collector('userAgent')] })).toThrow();
    expect(
      () => new Fingerprint({ customCollectors: [collector('fixture'), collector('fixture')] }),
    ).toThrow();
  });
  it('imports and constructs safely outside the browser but cannot collect there', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    const fp = new Fingerprint();
    await expect(fp.generate()).rejects.toMatchObject({ code: 'NOT_BROWSER' });
    await expect(fp.getComponents()).rejects.toMatchObject({ code: 'NOT_BROWSER' });
  });
});
