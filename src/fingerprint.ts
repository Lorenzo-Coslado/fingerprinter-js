import { SuspectAnalyzer } from "./suspect-analyzer";
import {
  ComponentCollector,
  FingerprintOptions,
  FingerprintResult,
} from "./types";
import { isBrowser, safeStringify, sha256 } from "./utils";

// Import all collectors
import { AudioCollector, FontsCollector } from "./collectors/advanced";
import {
  LanguageCollector,
  PluginsCollector,
  ScreenCollector,
  TimezoneCollector,
  UserAgentCollector,
} from "./collectors/basic";
import { CanvasCollector, WebGLCollector } from "./collectors/canvas";

/**
 * Main Fingerprint class
 */
export class Fingerprint {
  private collectors: ComponentCollector[] = [];
  private options: FingerprintOptions;

  constructor(options: FingerprintOptions = {}) {
    this.options = options;
    this.initializeCollectors();
  }

  private initializeCollectors(): void {
    // Always include basic collectors
    this.collectors.push(new UserAgentCollector());

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

    if (!this.options.excludeCanvas) {
      this.collectors.push(new CanvasCollector());
    }

    if (!this.options.excludeWebGL) {
      this.collectors.push(new WebGLCollector());
    }

    if (!this.options.excludeAudio) {
      this.collectors.push(new AudioCollector());
    }

    if (!this.options.excludeFonts) {
      this.collectors.push(new FontsCollector());
    }
  }

  /**
   * Normalize custom data to ensure stability by removing temporal values
   */
  private normalizeCustomData(data: Record<string, any>): Record<string, any> {
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
          // Likely timestamp
          delete normalized[key];
        }
        // Remove values that change too rapidly (potential random numbers)
        if (Math.random && value === Math.random()) {
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
   * Generate a fingerprint
   */
  async generate(): Promise<FingerprintResult> {
    if (!isBrowser()) {
      throw new Error(
        "Fingerprinting is only available in browser environments"
      );
    }

    const components: Record<string, any> = {};
    let confidence = 0;

    // Collect all components
    for (const collector of this.collectors) {
      try {
        const data = await collector.collect();
        components[collector.name] = data;

        // Calculate confidence based on available components
        if (data && data !== "unknown" && data !== "no-canvas" && !data.error) {
          confidence += 1;
        }
      } catch (error) {
        components[collector.name] = { error: (error as Error).message };
      }
    }

    // Add custom data if provided
    if (this.options.customData) {
      let customDataToUse = this.options.customData;

      // Normalize custom data unless explicitly disabled
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

    // Generate fingerprint hash
    const dataString = safeStringify(components);
    const fingerprint = await sha256(dataString);

    // Generate suspect analysis if requested
    let suspectAnalysis = undefined;
    if (this.options.includeSuspectAnalysis) {
      suspectAnalysis = SuspectAnalyzer.analyze(components);
    }

    return {
      fingerprint,
      components,
      confidence: confidencePercentage,
      suspectAnalysis,
    };
  }

  /**
   * Get component data without generating hash
   */
  async getComponents(): Promise<Record<string, any>> {
    if (!isBrowser()) {
      throw new Error(
        "Fingerprinting is only available in browser environments"
      );
    }

    const components: Record<string, any> = {};

    for (const collector of this.collectors) {
      try {
        const data = await collector.collect();
        components[collector.name] = data;
      } catch (error) {
        components[collector.name] = { error: (error as Error).message };
      }
    }

    if (this.options.customData) {
      let customDataToUse = this.options.customData;

      // Normalize custom data unless explicitly disabled
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
      "userAgent",
      "language",
      "timezone",
      "screen",
      "plugins",
      "canvas",
      "webgl",
      "audio",
      "fonts",
    ];
  }
}

// Export for convenience
export default Fingerprint;
