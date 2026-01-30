/**
 * FingerprinterJS v2.0
 * Main Fingerprint Class
 */

import { SuspectAnalyzer } from "./suspect-analyzer";
import {
    ComponentCollector,
    DEFAULT_OPTIONS,
    FingerprintError,
    FingerprintOptions,
    FingerprintResult,
    VERSION,
} from "./types";
import { isBrowser, safeStringify, sha256 } from "./utils";

// Import all collectors
import {
    AudioCollector,
    BatteryCollector,
    CanvasCollector,
    ClientHintsCollector,
    ConnectionCollector,
    FontsCollector,
    HardwareCollector,
    LanguageCollector,
    MathCollector,
    MediaDevicesCollector,
    PermissionsCollector,
    PluginsCollector,
    ScreenCollector,
    StorageCollector,
    TimezoneCollector,
    TouchCollector,
    UserAgentCollector,
    WebGLCollector,
    WebRTCCollector,
} from "./collectors";

/**
 * Main Fingerprint class
 * Generates unique browser fingerprints using multiple techniques
 */
export class Fingerprint {
  private collectors: ComponentCollector[] = [];
  private options: FingerprintOptions;

  constructor(options: FingerprintOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initializeCollectors();
  }

  /**
   * Initialize collectors based on options
   */
  private initializeCollectors(): void {
    // Basic collectors (always included unless excluded)
    if (!this.options.excludeUserAgent) {
      this.collectors.push(new UserAgentCollector());
    }

    if (!this.options.excludeLanguage) {
      this.collectors.push(new LanguageCollector());
    }

    if (!this.options.excludeTimezone) {
      this.collectors.push(new TimezoneCollector());
    }

    if (!this.options.excludeScreenResolution) {
      this.collectors.push(new ScreenCollector());
    }

    if (!this.options.excludePlugins) {
      this.collectors.push(new PluginsCollector());
    }

    // Graphics collectors
    if (!this.options.excludeCanvas) {
      this.collectors.push(new CanvasCollector());
    }

    if (!this.options.excludeWebGL) {
      this.collectors.push(new WebGLCollector());
    }

    // Advanced collectors
    if (!this.options.excludeAudio) {
      this.collectors.push(new AudioCollector());
    }

    if (!this.options.excludeFonts) {
      this.collectors.push(new FontsCollector());
    }

    // New v2.0 collectors
    if (!this.options.excludeHardware) {
      this.collectors.push(new HardwareCollector());
    }

    if (!this.options.excludeWebRTC) {
      this.collectors.push(new WebRTCCollector());
    }

    if (!this.options.excludeClientHints) {
      this.collectors.push(new ClientHintsCollector());
    }

    if (!this.options.excludeStorage) {
      this.collectors.push(new StorageCollector());
    }

    if (!this.options.excludeBattery) {
      this.collectors.push(new BatteryCollector());
    }

    if (!this.options.excludeConnection) {
      this.collectors.push(new ConnectionCollector());
    }

    if (!this.options.excludeTouch) {
      this.collectors.push(new TouchCollector());
    }

    if (!this.options.excludePermissions) {
      this.collectors.push(new PermissionsCollector());
    }

    if (!this.options.excludeMath) {
      this.collectors.push(new MathCollector());
    }

    if (!this.options.excludeMediaDevices) {
      this.collectors.push(new MediaDevicesCollector());
    }
  }

  /**
   * Normalize custom data to ensure stability by removing temporal values
   */
  private normalizeCustomData(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    if (!data || typeof data !== "object") {
      return data;
    }

    const normalized = { ...data };

    // List of keys that are known to cause instability
    const unstableKeys = [
      "timestamp",
      "time",
      "now",
      "date",
      "random",
      "rand",
      "nonce",
      "salt",
      "sessionId",
      "requestId",
      "uuid",
      "performance",
      "timing",
    ];

    // Remove unstable keys
    for (const key of unstableKeys) {
      if (key in normalized) {
        delete normalized[key];
      }
    }

    // Also check for values that look like timestamps or random data
    for (const [key, value] of Object.entries(normalized)) {
      if (typeof value === "number") {
        // Remove values that look like timestamps (very large numbers)
        if (value > 1000000000000 && value < 9999999999999) {
          delete normalized[key];
        }
      }

      if (typeof value === "string") {
        // Remove UUIDs or similar patterns
        if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value
          )
        ) {
          delete normalized[key];
        }
      }
    }

    return normalized;
  }

  /**
   * Calculate entropy from components
   */
  private calculateEntropy(components: Record<string, unknown>): number {
    let totalEntropy = 0;

    for (const collector of this.collectors) {
      const data = components[collector.name];
      if (data && !this.hasError(data)) {
        totalEntropy += collector.metadata?.entropy || 2;
      }
    }

    return totalEntropy;
  }

  /**
   * Check if a component has an error
   */
  private hasError(data: unknown): boolean {
    return (
      data === "unknown" ||
      data === "no-canvas" ||
      (typeof data === "object" && data !== null && "error" in data)
    );
  }

  /**
   * Generate a fingerprint
   */
  async generate(): Promise<FingerprintResult> {
    if (!isBrowser()) {
      throw new FingerprintError(
        "Fingerprinting is only available in browser environments",
        "NOT_BROWSER"
      );
    }

    const startTime = performance.now();
    const components: Record<string, unknown> = {};
    let confidence = 0;

    // Collect all components (in parallel for better performance)
    const collectionPromises = this.collectors.map(async (collector) => {
      try {
        const data = await collector.collect();
        return { name: collector.name, data, error: null };
      } catch (error) {
        return {
          name: collector.name,
          data: null,
          error: (error as Error).message,
        };
      }
    });

    const results = await Promise.all(collectionPromises);

    // Process results
    for (const result of results) {
      if (result.error) {
        components[result.name] = { error: result.error };
      } else {
        components[result.name] = result.data;
        if (!this.hasError(result.data)) {
          confidence += 1;
        }
      }
    }

    // Add custom data if provided
    if (this.options.customData) {
      let customDataToUse = this.options.customData;

      if (!this.options.allowUnstableData) {
        customDataToUse = this.normalizeCustomData(this.options.customData);
      }

      if (Object.keys(customDataToUse).length > 0) {
        components.custom = customDataToUse;
        confidence += 0.5;
      }
    }

    // Calculate confidence percentage
    const maxConfidence =
      this.collectors.length + (this.options.customData ? 0.5 : 0);
    const confidencePercentage = Math.round((confidence / maxConfidence) * 100);

    // Calculate entropy
    const entropy = this.calculateEntropy(components);

    // Generate fingerprint hash
    const dataString = safeStringify(components);
    const fingerprint = await sha256(dataString);

    // Calculate duration
    const duration = performance.now() - startTime;

    // Generate suspect analysis if requested
    let suspectAnalysis = undefined;
    if (this.options.includeSuspectAnalysis) {
      suspectAnalysis = SuspectAnalyzer.analyze(components);
    }

    return {
      fingerprint,
      components,
      confidence: confidencePercentage,
      entropy,
      duration,
      version: VERSION,
      suspectAnalysis,
    };
  }

  /**
   * Get component data without generating hash
   */
  async getComponents(): Promise<Record<string, unknown>> {
    if (!isBrowser()) {
      throw new FingerprintError(
        "Fingerprinting is only available in browser environments",
        "NOT_BROWSER"
      );
    }

    const components: Record<string, unknown> = {};

    // Collect all components in parallel
    const collectionPromises = this.collectors.map(async (collector) => {
      try {
        const data = await collector.collect();
        return { name: collector.name, data };
      } catch (error) {
        return { name: collector.name, data: { error: (error as Error).message } };
      }
    });

    const results = await Promise.all(collectionPromises);

    for (const result of results) {
      components[result.name] = result.data;
    }

    if (this.options.customData) {
      let customDataToUse = this.options.customData;

      if (!this.options.allowUnstableData) {
        customDataToUse = this.normalizeCustomData(this.options.customData);
      }

      if (Object.keys(customDataToUse).length > 0) {
        components.custom = customDataToUse;
      }
    }

    return components;
  }

  /**
   * Static method to quickly generate a fingerprint with default options
   */
  static async generate(
    options: FingerprintOptions = {}
  ): Promise<FingerprintResult> {
    const fp = new Fingerprint(options);
    return fp.generate();
  }

  /**
   * Static method to get available collectors
   */
  static getAvailableCollectors(): string[] {
    return [
      // Basic
      "userAgent",
      "language",
      "timezone",
      "screen",
      "plugins",
      // Graphics
      "canvas",
      "webgl",
      // Advanced
      "audio",
      "fonts",
      // New v2.0
      "hardware",
      "webrtc",
      "clientHints",
      "storage",
      "battery",
      "connection",
      "touch",
      "permissions",
      "math",
      "mediaDevices",
    ];
  }

  /**
   * Get version
   */
  static getVersion(): string {
    return VERSION;
  }
}

// Export for convenience
export default Fingerprint;
