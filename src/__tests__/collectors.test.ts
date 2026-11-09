import { afterEach, describe, expect, it, vi } from 'vitest';
import { Fingerprint } from '../fingerprint';
import {
  AudioCollector,
  BatteryCollector,
  FontsCollector,
  StorageCollector,
  WebGLCollector,
  WebRTCCollector,
} from '../collectors';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('storage probes', () => {
  it('preserves existing application values and removes only its own temporary keys', async () => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('__fp_test__', 'application-local');
    sessionStorage.setItem('__fp_test__', 'application-session');
    localStorage.setItem('unrelated', 'keep');
    const result = await new StorageCollector().collect();
    expect(result.localStorage).toBe(true);
    expect(result.sessionStorage).toBe(true);
    expect(localStorage.getItem('__fp_test__')).toBe('application-local');
    expect(sessionStorage.getItem('__fp_test__')).toBe('application-session');
    expect(localStorage.getItem('unrelated')).toBe('keep');
    expect(Object.keys(localStorage)).toHaveLength(2);
    expect(Object.keys(sessionStorage)).toHaveLength(1);
  });
  it('does not overwrite an occupied probe key', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('occupied');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const remove = vi.spyOn(Storage.prototype, 'removeItem');
    const result = await new StorageCollector().collect();
    expect(result.localStorage).toBe(false);
    expect(result.sessionStorage).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
  it('does not pretend quota denial invalidates working availability probes', async () => {
    vi.stubGlobal('navigator', {
      cookieEnabled: true,
      storage: { estimate: vi.fn().mockRejectedValue(new DOMException('Denied', 'SecurityError')) },
    });
    const result = await new StorageCollector().collect();
    expect(result.localStorage).toBe(true);
    expect(result.quotaEstimate).toBeNull();
  });
});

describe('WebRTC lifecycle', () => {
  it('does not create a connection for a standalone pre-aborted call', async () => {
    const peer = vi.fn();
    vi.stubGlobal('RTCPeerConnection', peer);
    const controller = new AbortController();
    controller.abort();
    await expect(
      new WebRTCCollector().collect({ signal: controller.signal, onCleanup: () => {} }),
    ).rejects.toMatchObject({ code: 'ABORTED' });
    expect(peer).not.toHaveBeenCalled();
  });
  it('uses no external ICE server and closes on createOffer failure', async () => {
    const close = vi.fn();
    const options: unknown[] = [];
    vi.stubGlobal(
      'RTCPeerConnection',
      class {
        onicecandidate = null;
        constructor(config: unknown) {
          options.push(config);
        }
        createDataChannel(): void {}
        createOffer(): Promise<never> {
          return Promise.reject(new Error('Offer failed'));
        }
        close = close;
      },
    );
    await expect(new WebRTCCollector().collect()).rejects.toThrow('Offer failed');
    expect(options).toEqual([{ iceServers: [] }]);
    expect(close).toHaveBeenCalledOnce();
  });
  it('closes on cancellation even when createOffer never settles', async () => {
    vi.useFakeTimers();
    const close = vi.fn();
    vi.stubGlobal(
      'RTCPeerConnection',
      class {
        onicecandidate = null;
        createDataChannel(): void {}
        createOffer(): Promise<never> {
          return new Promise(() => {});
        }
        close = close;
      },
    );
    const controller = new AbortController();
    const promise = new WebRTCCollector().collect({
      signal: controller.signal,
      onCleanup: () => {},
    });
    const assertion = expect(promise).rejects.toMatchObject({ code: 'ABORTED' });
    controller.abort();
    await assertion;
    expect(close).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cleans up after the configured standalone deadline', async () => {
    vi.useFakeTimers();
    const close = vi.fn();
    vi.stubGlobal(
      'RTCPeerConnection',
      class {
        onicecandidate = null;
        createDataChannel(): void {}
        createOffer(): Promise<never> {
          return new Promise(() => {});
        }
        close = close;
      },
    );
    const promise = new WebRTCCollector().setTimeout(5).collect();
    const assertion = expect(promise).rejects.toMatchObject({ code: 'COLLECTOR_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(6);
    await assertion;
    expect(close).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('graphics, fonts and audio resources', () => {
  it('releases a WebGL context after observation', () => {
    const loseContext = vi.fn();
    const gl = {
      VENDOR: 1,
      RENDERER: 2,
      VERSION: 3,
      SHADING_LANGUAGE_VERSION: 4,
      MAX_TEXTURE_SIZE: 5,
      MAX_VIEWPORT_DIMS: 6,
      MAX_VERTEX_ATTRIBS: 7,
      MAX_VERTEX_UNIFORM_VECTORS: 8,
      MAX_FRAGMENT_UNIFORM_VECTORS: 9,
      MAX_VARYING_VECTORS: 10,
      getParameter: (parameter: number): unknown =>
        parameter === 6 ? new Int32Array([100, 100]) : parameter <= 4 ? 'renderer' : 8,
      getSupportedExtensions: () => ['z', 'a'],
      getExtension: (name: string): unknown =>
        name === 'WEBGL_lose_context' ? { loseContext } : null,
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      gl as unknown as WebGLRenderingContext,
    );
    const data = new WebGLCollector().collect();
    expect(data.extensions).toEqual(['a', 'z']);
    expect(data.maxViewportDims).toEqual([100, 100]);
    expect(loseContext).toHaveBeenCalledOnce();
  });
  it('releases a WebGL context when reading a graphics capability throws', () => {
    const loseContext = vi.fn();
    const gl = {
      getParameter: () => {
        throw new Error('Lost context');
      },
      getExtension: (name: string) => (name === 'WEBGL_lose_context' ? { loseContext } : null),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      gl as unknown as WebGLRenderingContext,
    );
    expect(() => new WebGLCollector().collect()).toThrow('Lost context');
    expect(loseContext).toHaveBeenCalledOnce();
  });
  it('removes font probes if layout measurement fails', () => {
    const before = document.body.childElementCount;
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => {
      throw new Error('No layout');
    });
    expect(() => new FontsCollector().collect()).toThrow('No layout');
    expect(document.body.childElementCount).toBe(before);
  });
  it('uses offline audio and disconnects nodes after rendering', async () => {
    const disconnectOscillator = vi.fn();
    const disconnectCompressor = vi.fn();
    vi.stubGlobal(
      'OfflineAudioContext',
      class {
        sampleRate = 44100;
        state = 'closed';
        destination = {
          maxChannelCount: 1,
          channelCount: 1,
          channelCountMode: 'explicit',
          channelInterpretation: 'speakers',
        };
        createOscillator(): unknown {
          return {
            type: 'sine',
            frequency: { value: 0 },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            disconnect: disconnectOscillator,
          };
        }
        createDynamicsCompressor(): unknown {
          return {
            threshold: { value: 0 },
            knee: { value: 0 },
            ratio: { value: 0 },
            attack: { value: 0 },
            release: { value: 0 },
            connect: vi.fn(),
            disconnect: disconnectCompressor,
          };
        }
        startRendering(): Promise<unknown> {
          return Promise.resolve({ getChannelData: () => new Float32Array([0.25, 0.5, -0.5]) });
        }
      },
    );
    const data = await new AudioCollector().collect();
    expect(data.audioFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(disconnectOscillator).toHaveBeenCalledOnce();
    expect(disconnectCompressor).toHaveBeenCalledOnce();
  });
});

describe('availability and native error states', () => {
  it('represents device denial as blocked without fabricated zero counts', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        enumerateDevices: vi
          .fn()
          .mockRejectedValue(new DOMException('No camera access', 'NotAllowedError')),
      },
    });
    const result = await Fingerprint.generate({ collectors: ['mediaDevices'] });
    expect(result.collectorResults.mediaDevices.status).toBe('blocked');
    expect(result.components.mediaDevices).toBeUndefined();
    expect(result.collectionCoverage).toBe(0);
  });
  it('does not include permission-dependent device counts or quota in hash projections', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: { enumerateDevices: vi.fn().mockResolvedValue([{ kind: 'videoinput' }]) },
      cookieEnabled: true,
    });
    const first = await Fingerprint.generate({ collectors: ['mediaDevices', 'storage'] });
    vi.stubGlobal('navigator', {
      mediaDevices: {
        enumerateDevices: vi
          .fn()
          .mockResolvedValue([{ kind: 'audioinput' }, { kind: 'videoinput' }]),
      },
      cookieEnabled: false,
    });
    const second = await Fingerprint.generate({ collectors: ['mediaDevices', 'storage'] });
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.components.mediaDevices).not.toEqual(second.components.mediaDevices);
    expect(first.hashComponents).toEqual([]);
  });
  it('excludes zoom and resolution changes from the screen projection', async () => {
    vi.stubGlobal('screen', {
      width: 1000,
      height: 600,
      availWidth: 900,
      availHeight: 500,
      colorDepth: 24,
      pixelDepth: 24,
    });
    const first = await Fingerprint.generate({ collectors: ['screen'] });
    vi.stubGlobal('screen', {
      width: 2000,
      height: 1200,
      availWidth: 1900,
      availHeight: 1100,
      colorDepth: 24,
      pixelDepth: 24,
    });
    const second = await Fingerprint.generate({ collectors: ['screen'] });
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.components.screen).not.toEqual(second.components.screen);
  });
  it('excludes Client Hints brand order and versions from the low-entropy projection', async () => {
    const highEntropy = vi.fn();
    vi.stubGlobal('navigator', {
      userAgentData: {
        brands: [
          { brand: 'Chromium', version: '100' },
          { brand: 'Random', version: '99' },
        ],
        platform: 'Linux',
        mobile: false,
        getHighEntropyValues: highEntropy,
      },
    });
    const first = await Fingerprint.generate({ collectors: ['clientHints'] });
    vi.stubGlobal('navigator', {
      userAgentData: {
        brands: [
          { brand: 'Random', version: '101' },
          { brand: 'Chromium', version: '200' },
        ],
        platform: 'Linux',
        mobile: false,
        getHighEntropyValues: highEntropy,
      },
    });
    const second = await Fingerprint.generate({ collectors: ['clientHints'] });
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.components.clientHints).not.toEqual(second.components.clientHints);
    expect(highEntropy).not.toHaveBeenCalled();
  });
  it('normalizes infinite battery estimates to explicit null JSON values', async () => {
    vi.stubGlobal('navigator', {
      getBattery: () =>
        Promise.resolve({
          charging: false,
          level: 0.5,
          chargingTime: Infinity,
          dischargingTime: Infinity,
        }),
    });
    const battery = await new BatteryCollector().collect();
    expect(battery).toMatchObject({ chargingTime: null, dischargingTime: null });
  });
});
