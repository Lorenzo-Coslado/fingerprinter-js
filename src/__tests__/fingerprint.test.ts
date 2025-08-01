/**
 * @jest-environment jsdom
 */

import { Fingerprint } from "../fingerprint";
import { isBrowser } from "../utils";

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
        digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
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

describe("Fingerprint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isBrowser", () => {
    it("should detect browser environment", () => {
      expect(isBrowser()).toBe(true);
    });
  });

  describe("Fingerprint class", () => {
    it("should create instance with default options", () => {
      const fp = new Fingerprint();
      expect(fp).toBeInstanceOf(Fingerprint);
    });

    it("should create instance with custom options", () => {
      const options = {
        excludeCanvas: true,
        excludeWebGL: true,
      };
      const fp = new Fingerprint(options);
      expect(fp).toBeInstanceOf(Fingerprint);
    });

    it("should generate fingerprint", async () => {
      const fp = new Fingerprint();
      const result = await fp.generate();

      expect(result).toHaveProperty("fingerprint");
      expect(result).toHaveProperty("components");
      expect(result).toHaveProperty("confidence");
      expect(typeof result.fingerprint).toBe("string");
      expect(typeof result.components).toBe("object");
      expect(typeof result.confidence).toBe("number");
    });

    it("should get components without generating hash", async () => {
      const fp = new Fingerprint();
      const components = await fp.getComponents();

      expect(typeof components).toBe("object");
      expect(components).toHaveProperty("userAgent");
    });

    it("should include custom data when provided", async () => {
      const customData = { customField: "customValue" };
      const fp = new Fingerprint({ customData });
      const result = await fp.generate();

      expect(result.components).toHaveProperty("custom");
      expect(result.components.custom).toEqual(customData);
    });

    it("should exclude components based on options", async () => {
      const fp = new Fingerprint({
        excludeLanguage: true,
        excludeTimezone: true,
      });
      const components = await fp.getComponents();

      expect(components).not.toHaveProperty("language");
      expect(components).not.toHaveProperty("timezone");
      expect(components).toHaveProperty("userAgent");
    });
  });

  describe("Static methods", () => {
    it("should generate fingerprint with static method", async () => {
      const result = await Fingerprint.generate();

      expect(result).toHaveProperty("fingerprint");
      expect(result).toHaveProperty("components");
      expect(result).toHaveProperty("confidence");
    });

    it("should return available collectors", () => {
      const collectors = Fingerprint.getAvailableCollectors();

      expect(Array.isArray(collectors)).toBe(true);
      expect(collectors.length).toBeGreaterThan(0);
      expect(collectors).toContain("userAgent");
      expect(collectors).toContain("canvas");
    });
  });
});
