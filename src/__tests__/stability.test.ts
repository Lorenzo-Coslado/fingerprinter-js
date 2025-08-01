/**
 * @jest-environment jsdom
 */

import { Fingerprint } from "../fingerprint";

// Mock some browser APIs that might not be available in jsdom
beforeAll(() => {
  // Mock TextEncoder/TextDecoder
  global.TextEncoder = jest.fn().mockImplementation(() => ({
    encode: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4])),
  }));

  global.TextDecoder = jest.fn().mockImplementation(() => ({
    decode: jest.fn().mockReturnValue("decoded"),
  }));

  // Mock crypto for tests
  Object.defineProperty(global, "crypto", {
    value: {
      subtle: {
        digest: jest.fn().mockImplementation(async (algorithm, data) => {
          // Simulate different hashes for different data
          const dataString = new TextDecoder().decode(data);
          const hash = new ArrayBuffer(32);
          const view = new Uint8Array(hash);

          // Simple hash simulation based on data content
          for (let i = 0; i < dataString.length && i < 32; i++) {
            view[i] = dataString.charCodeAt(i) % 256;
          }

          return hash;
        }),
      },
    },
    writable: true,
  });

  // Mock canvas methods
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    fillText: jest.fn(),
    arc: jest.fn(),
    beginPath: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
  })) as any;

  HTMLCanvasElement.prototype.toDataURL = jest.fn(
    () => "data:image/png;base64,test"
  );

  // Mock audio context
  global.AudioContext = jest.fn().mockImplementation(() => ({
    sampleRate: 44100,
    state: "suspended",
    destination: {
      maxChannelCount: 2,
      channelCount: 2,
      channelCountMode: "max",
      channelInterpretation: "speakers",
    },
    createOscillator: jest.fn(() => ({
      type: "sine",
      frequency: { setValueAtTime: jest.fn() },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    })),
    createAnalyser: jest.fn(() => ({
      frequencyBinCount: 1024,
      getFloatFrequencyData: jest.fn(),
      connect: jest.fn(),
    })),
    createGain: jest.fn(() => ({
      gain: { setValueAtTime: jest.fn() },
      connect: jest.fn(),
    })),
    createScriptProcessor: jest.fn(() => ({
      onaudioprocess: null,
      connect: jest.fn(),
    })),
    close: jest.fn().mockResolvedValue(undefined),
    currentTime: 0,
  }));
});

describe("Fingerprint Stability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Custom data normalization", () => {
    it("should remove unstable timestamp data by default", async () => {
      const fp1 = new Fingerprint({
        customData: {
          timestamp: Date.now(),
          stableValue: "test",
          time: 1722420569123,
        },
      });

      const fp2 = new Fingerprint({
        customData: {
          timestamp: Date.now() + 1000, // Different timestamp
          stableValue: "test",
          time: 1722420570456, // Different time
        },
      });

      const result1 = await fp1.generate();
      const result2 = await fp2.generate();

      // Fingerprints should be identical despite different timestamps
      expect(result1.fingerprint).toBe(result2.fingerprint);

      // Custom data should only contain stable values
      expect(result1.components.custom).toEqual({ stableValue: "test" });
      expect(result2.components.custom).toEqual({ stableValue: "test" });
    });

    it("should remove random and UUID-like data", async () => {
      const fp1 = new Fingerprint({
        customData: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          random: Math.random(),
          sessionId: "random-session-123",
          stableValue: "test",
        },
      });

      const fp2 = new Fingerprint({
        customData: {
          uuid: "987e6543-e21b-12d3-a456-426614174999",
          random: Math.random(),
          sessionId: "random-session-456",
          stableValue: "test",
        },
      });

      const result1 = await fp1.generate();
      const result2 = await fp2.generate();

      // Should be identical after normalization
      expect(result1.fingerprint).toBe(result2.fingerprint);
      expect(result1.components.custom).toEqual({ stableValue: "test" });
    });

    it("should allow unstable data when allowUnstableData is true", async () => {
      const timestamp1 = Date.now();
      const timestamp2 = timestamp1 + 1000;

      const fp1 = new Fingerprint({
        allowUnstableData: true,
        customData: {
          timestamp: timestamp1,
          stableValue: "test",
        },
      });

      const fp2 = new Fingerprint({
        allowUnstableData: true,
        customData: {
          timestamp: timestamp2,
          stableValue: "test",
        },
      });

      const components1 = await fp1.getComponents();
      const components2 = await fp2.getComponents();

      // Custom data should include timestamps when allowUnstableData is true
      expect(components1.custom.timestamp).toBe(timestamp1);
      expect(components2.custom.timestamp).toBe(timestamp2);
      expect(components1.custom.stableValue).toBe("test");
      expect(components2.custom.stableValue).toBe("test");
    });

    it("should generate identical fingerprints with identical data", async () => {
      const fp1 = new Fingerprint({
        customData: {
          version: "1.0",
          app: "test",
        },
      });

      const fp2 = new Fingerprint({
        customData: {
          version: "1.0",
          app: "test",
        },
      });

      const result1 = await fp1.generate();
      const result2 = await fp2.generate();

      expect(result1.fingerprint).toBe(result2.fingerprint);
    });

    it("should handle empty or missing custom data", async () => {
      const fp1 = new Fingerprint({ customData: {} });
      const fp2 = new Fingerprint({ customData: undefined });
      const fp3 = new Fingerprint({});

      const result1 = await fp1.generate();
      const result2 = await fp2.generate();
      const result3 = await fp3.generate();

      // All should be identical when no custom data
      expect(result1.fingerprint).toBe(result2.fingerprint);
      expect(result2.fingerprint).toBe(result3.fingerprint);
    });
  });
});
