/**
 * Suspect Score Analyzer v2.0
 * Advanced bot, fraud, and automation detection
 */

export interface SuspectAnalysis {
  score: number; // 0-100 (0 = legitimate, 100 = very suspicious)
  signals: SuspectSignal[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  details: Record<string, unknown>;
}

export interface SuspectSignal {
  type: string;
  severity: number; // 0-10
  description: string;
  detected: boolean;
  category: SignalCategory;
}

export type SignalCategory =
  | "automation"
  | "inconsistency"
  | "environment"
  | "bot"
  | "privacy";

export class SuspectAnalyzer {
  /**
   * Analyzes a fingerprint to detect suspicious signals
   */
  static analyze(components: Record<string, unknown>): SuspectAnalysis {
    const signals: SuspectSignal[] = [];

    // 1. Automation detection
    signals.push(...this.checkAutomation(components));

    // 2. Technical inconsistencies
    signals.push(...this.checkConsistency(components));

    // 3. Suspicious environment
    signals.push(...this.checkEnvironment(components));

    // 4. Bot patterns
    signals.push(...this.checkBotPatterns(components));

    // 5. Privacy tools detection
    signals.push(...this.checkPrivacyTools(components));

    // Calculate total score
    const detectedSignals = signals.filter((s) => s.detected);
    let totalScore = detectedSignals.reduce(
      (sum, signal) => sum + signal.severity * 10,
      0
    );
    totalScore = Math.min(100, totalScore);

    const riskLevel = this.calculateRiskLevel(totalScore);

    return {
      score: totalScore,
      signals: detectedSignals,
      riskLevel,
      details: {
        totalSignalsDetected: detectedSignals.length,
        highSeveritySignals: detectedSignals.filter((s) => s.severity >= 8)
          .length,
        automationDetected: signals
          .filter((s) => s.category === "automation")
          .some((s) => s.detected),
        inconsistenciesFound: signals
          .filter((s) => s.category === "inconsistency")
          .some((s) => s.detected),
        privacyToolsDetected: signals
          .filter((s) => s.category === "privacy")
          .some((s) => s.detected),
      },
    };
  }

  /**
   * Detects automation signals
   */
  private static checkAutomation(
    components: Record<string, unknown>
  ): SuspectSignal[] {
    const signals: SuspectSignal[] = [];

    // WebDriver detection
    signals.push({
      type: "webdriver",
      severity: 9,
      description: "WebDriver automation detected",
      detected: this.hasWebDriver(),
      category: "automation",
    });

    // Headless browser
    signals.push({
      type: "headless",
      severity: 8,
      description: "Headless browser detected",
      detected: this.isHeadless(components),
      category: "automation",
    });

    // PhantomJS signatures
    signals.push({
      type: "phantom",
      severity: 7,
      description: "PhantomJS signatures detected",
      detected: this.hasPhantomSignatures(components),
      category: "automation",
    });

    // Selenium signatures
    signals.push({
      type: "selenium",
      severity: 8,
      description: "Selenium signatures detected",
      detected: this.hasSeleniumSignatures(),
      category: "automation",
    });

    // Puppeteer detection
    signals.push({
      type: "puppeteer",
      severity: 9,
      description: "Puppeteer automation detected",
      detected: this.hasPuppeteerSignatures(),
      category: "automation",
    });

    // Playwright detection
    signals.push({
      type: "playwright",
      severity: 9,
      description: "Playwright automation detected",
      detected: this.hasPlaywrightSignatures(),
      category: "automation",
    });

    // Chrome DevTools Protocol
    signals.push({
      type: "cdp",
      severity: 7,
      description: "Chrome DevTools Protocol artifacts detected",
      detected: this.hasCDPArtifacts(),
      category: "automation",
    });

    return signals;
  }

  /**
   * Checks data consistency
   */
  private static checkConsistency(
    components: Record<string, unknown>
  ): SuspectSignal[] {
    const signals: SuspectSignal[] = [];

    // Timezone vs Language inconsistency
    signals.push({
      type: "timezone_language",
      severity: 5,
      description: "Timezone/language inconsistency",
      detected: this.hasTimezoneLanguageInconsistency(components),
      category: "inconsistency",
    });

    // Screen resolution inconsistency
    signals.push({
      type: "screen_consistency",
      severity: 6,
      description: "Screen resolution inconsistency",
      detected: this.hasScreenInconsistency(components),
      category: "inconsistency",
    });

    // Canvas fingerprint too generic
    signals.push({
      type: "generic_canvas",
      severity: 4,
      description: "Canvas fingerprint too generic",
      detected: this.hasGenericCanvas(components),
      category: "inconsistency",
    });

    // User agent vs platform mismatch
    signals.push({
      type: "ua_platform_mismatch",
      severity: 6,
      description: "User-Agent doesn't match platform",
      detected: this.hasUAPlatformMismatch(components),
      category: "inconsistency",
    });

    // Hardware inconsistency (0 cores or 0 memory)
    signals.push({
      type: "hardware_inconsistency",
      severity: 5,
      description: "Suspicious hardware values",
      detected: this.hasHardwareInconsistency(components),
      category: "inconsistency",
    });

    return signals;
  }

  /**
   * Checks execution environment
   */
  private static checkEnvironment(
    components: Record<string, unknown>
  ): SuspectSignal[] {
    const signals: SuspectSignal[] = [];

    // Missing expected APIs
    signals.push({
      type: "missing_apis",
      severity: 6,
      description: "Missing browser APIs",
      detected: this.hasMissingAPIs(components),
      category: "environment",
    });

    // Too many errors in collection
    signals.push({
      type: "collection_errors",
      severity: 5,
      description: "Too many collection errors",
      detected: this.hasTooManyErrors(components),
      category: "environment",
    });

    // Suspicious user agent
    signals.push({
      type: "suspicious_ua",
      severity: 7,
      description: "Suspicious user agent",
      detected: this.hasSuspiciousUserAgent(components),
      category: "environment",
    });

    // Zero touch points on mobile UA
    signals.push({
      type: "touch_ua_mismatch",
      severity: 5,
      description: "Mobile UA but no touch support",
      detected: this.hasTouchUAMismatch(components),
      category: "environment",
    });

    return signals;
  }

  /**
   * Detects bot patterns
   */
  private static checkBotPatterns(
    components: Record<string, unknown>
  ): SuspectSignal[] {
    const signals: SuspectSignal[] = [];

    // Perfect fingerprint (too stable)
    signals.push({
      type: "too_perfect",
      severity: 3,
      description: "Fingerprint too perfect/stable",
      detected: this.isTooStable(components),
      category: "bot",
    });

    // Known bot signatures
    signals.push({
      type: "bot_signature",
      severity: 9,
      description: "Known bot signature detected",
      detected: this.hasKnownBotSignature(components),
      category: "bot",
    });

    // Unusual WebGL vendor
    signals.push({
      type: "webgl_vendor",
      severity: 4,
      description: "Unusual WebGL vendor",
      detected: this.hasUnusualWebGLVendor(components),
      category: "bot",
    });

    return signals;
  }

  /**
   * Detects privacy tools and fingerprint spoofing
   */
  private static checkPrivacyTools(
    components: Record<string, unknown>
  ): SuspectSignal[] {
    const signals: SuspectSignal[] = [];

    // Canvas noise detection (anti-fingerprint extensions)
    signals.push({
      type: "canvas_noise",
      severity: 5,
      description: "Canvas fingerprint noise detected",
      detected: this.hasCanvasNoise(components),
      category: "privacy",
    });

    // Property tampering detection
    signals.push({
      type: "property_tampering",
      severity: 6,
      description: "Browser property tampering detected",
      detected: this.hasPropertyTampering(),
      category: "privacy",
    });

    // Audio context tampering
    signals.push({
      type: "audio_tampering",
      severity: 5,
      description: "Audio context tampering detected",
      detected: this.hasAudioTampering(components),
      category: "privacy",
    });

    return signals;
  }

  // ================== Detection Methods ==================

  private static hasWebDriver(): boolean {
    if (typeof window === "undefined") return false;
    return (
      (navigator as any).webdriver === true ||
      !!(window as any).callPhantom ||
      !!(window as any)._phantom
    );
  }

  private static isHeadless(components: Record<string, unknown>): boolean {
    const ua = (components.userAgent as string) || "";
    if (
      ua.includes("HeadlessChrome") ||
      ua.includes("PhantomJS") ||
      ua.includes("Headless")
    ) {
      return true;
    }

    if (typeof window !== "undefined") {
      // Check for zero dimensions (headless indicators)
      if (window.outerHeight === 0 || window.outerWidth === 0) return true;

      // Check for missing chrome object in Chrome
      if (ua.includes("Chrome") && !(window as any).chrome) return true;
    }

    return false;
  }

  private static hasPhantomSignatures(
    components: Record<string, unknown>
  ): boolean {
    if (typeof window === "undefined") return false;
    const ua = (components.userAgent as string) || "";
    return (
      ua.includes("PhantomJS") ||
      !!(window as any)._phantom ||
      !!(window as any).callPhantom ||
      !!(window as any).__phantomas
    );
  }

  private static hasSeleniumSignatures(): boolean {
    if (typeof window === "undefined") return false;
    return !!(
      (window as any).selenium ||
      (window as any).webdriver ||
      (window.document as any).__selenium_unwrapped ||
      (window.document as any).__webdriver_evaluate ||
      (window.document as any).__driver_evaluate ||
      (window.document as any).__webdriver_script_function ||
      (window.document as any).__webdriver_script_func ||
      (window.document as any).__webdriver_script_fn ||
      (window.document as any).__fxdriver_evaluate ||
      (window.document as any).__driver_unwrapped ||
      (window.document as any).__webdriver_unwrapped ||
      (window.document as any).$cdc_asdjflasutopfhvcZLmcfl_ ||
      (window.document as any).$chrome_asyncScriptInfo
    );
  }

  private static hasPuppeteerSignatures(): boolean {
    if (typeof window === "undefined") return false;
    return !!(
      (window as any).__puppeteer_evaluation_script__ ||
      (navigator as any).webdriver ||
      (window as any).puppeteerBinding
    );
  }

  private static hasPlaywrightSignatures(): boolean {
    if (typeof window === "undefined") return false;
    return !!(
      (window as any).__playwright ||
      (window as any).__pw_manual ||
      (window as any)._playwright
    );
  }

  private static hasCDPArtifacts(): boolean {
    if (typeof window === "undefined") return false;
    return !!(
      (window as any).__cdp__ ||
      (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array ||
      (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise ||
      (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol
    );
  }

  private static hasTimezoneLanguageInconsistency(
    components: Record<string, unknown>
  ): boolean {
    const timezone = components.timezone as string;
    const language = components.language as string[];

    if (!timezone || !language) return false;

    // Suspicious combinations
    const suspiciousCombinations = [
      { tz: "America/New_York", lang: "zh-CN" },
      { tz: "Europe/Paris", lang: "ja-JP" },
      { tz: "Asia/Tokyo", lang: "es-ES" },
      { tz: "Europe/London", lang: "zh-CN" },
      { tz: "America/Los_Angeles", lang: "ru-RU" },
    ];

    return suspiciousCombinations.some(
      (combo) =>
        timezone.includes(combo.tz) &&
        Array.isArray(language) &&
        language.some((l) => l.includes(combo.lang))
    );
  }

  private static hasScreenInconsistency(
    components: Record<string, unknown>
  ): boolean {
    const screen = components.screen as Record<string, number>;
    if (!screen) return false;

    // Very common resolutions used by bots
    const suspiciousResolutions = ["800x600", "1024x768"];
    const resolution = `${screen.width}x${screen.height}`;

    return (
      suspiciousResolutions.includes(resolution) && screen.colorDepth === 24
    );
  }

  private static hasGenericCanvas(
    components: Record<string, unknown>
  ): boolean {
    const canvas = components.canvas as string;
    if (!canvas || typeof canvas !== "string") return false;
    return canvas.length < 100 || canvas === "no-canvas";
  }

  private static hasUAPlatformMismatch(
    components: Record<string, unknown>
  ): boolean {
    const ua = (components.userAgent as string) || "";
    const hardware = components.hardware as Record<string, unknown>;

    if (!hardware) return false;
    const platform = (hardware.platform as string) || "";

    // Windows UA but Mac/Linux platform
    if (ua.includes("Windows") && !platform.toLowerCase().includes("win")) {
      return true;
    }

    // Mac UA but Windows/Linux platform
    if (
      ua.includes("Macintosh") &&
      !platform.toLowerCase().includes("mac")
    ) {
      return true;
    }

    return false;
  }

  private static hasHardwareInconsistency(
    components: Record<string, unknown>
  ): boolean {
    const hardware = components.hardware as Record<string, unknown>;
    if (!hardware) return false;

    const cores = hardware.hardwareConcurrency as number;
    const memory = hardware.deviceMemory as number;

    // 0 cores is impossible
    if (cores === 0) return true;

    // More than 128 cores is suspicious
    if (cores > 128) return true;

    // Less than 0.25GB is suspicious for desktop
    if (memory !== null && memory < 0.25) return true;

    return false;
  }

  private static hasMissingAPIs(
    components: Record<string, unknown>
  ): boolean {
    const expectedAPIs = ["userAgent", "language", "screen"];
    const missingAPIs = expectedAPIs.filter((api) => {
      const value = components[api];
      return !value || (typeof value === "object" && (value as any).error);
    });

    return missingAPIs.length > 1;
  }

  private static hasTooManyErrors(
    components: Record<string, unknown>
  ): boolean {
    const errorCount = Object.values(components).filter(
      (value) => value && typeof value === "object" && (value as any).error
    ).length;

    return errorCount > 5;
  }

  private static hasSuspiciousUserAgent(
    components: Record<string, unknown>
  ): boolean {
    const ua = (components.userAgent as string) || "";
    const suspiciousPatterns = [
      "HeadlessChrome",
      "PhantomJS",
      "bot",
      "crawler",
      "spider",
      "scraper",
      "python-requests",
      "curl",
      "wget",
      "node-fetch",
      "axios",
    ];

    return suspiciousPatterns.some((pattern) =>
      ua.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private static hasTouchUAMismatch(
    components: Record<string, unknown>
  ): boolean {
    const ua = (components.userAgent as string) || "";
    const touch = components.touch as Record<string, unknown>;

    if (!touch) return false;

    const maxTouchPoints = touch.maxTouchPoints as number;
    const isMobileUA =
      ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone");

    // Mobile UA but no touch support
    return isMobileUA && maxTouchPoints === 0;
  }

  private static isTooStable(components: Record<string, unknown>): boolean {
    const perfectComponents = Object.values(components).filter(
      (value) =>
        value && !(typeof value === "object" && (value as any).error) && value !== "unknown"
    ).length;

    // If every single component is perfect with no errors, it's suspicious
    return perfectComponents === Object.keys(components).length;
  }

  private static hasKnownBotSignature(
    components: Record<string, unknown>
  ): boolean {
    const ua = (components.userAgent as string) || "";

    const botSignatures = [
      "Googlebot",
      "Bingbot",
      "Slurp",
      "DuckDuckBot",
      "Baiduspider",
      "YandexBot",
      "facebookexternalhit",
      "Twitterbot",
      "LinkedInBot",
      "WhatsApp",
      "python-requests",
      "curl/",
      "wget",
      "Scrapy",
      "HttpClient",
    ];

    return botSignatures.some((signature) => ua.includes(signature));
  }

  private static hasUnusualWebGLVendor(
    components: Record<string, unknown>
  ): boolean {
    const webgl = components.webgl as Record<string, unknown>;
    if (!webgl || webgl.error) return false;

    const vendor = (webgl.vendor as string) || "";
    const renderer = (webgl.renderer as string) || "";

    // SwiftShader is commonly used by headless browsers
    if (
      renderer.includes("SwiftShader") ||
      renderer.includes("llvmpipe") ||
      renderer.includes("VMware")
    ) {
      return true;
    }

    // Brian Paul Mesa is software rendering
    if (vendor.includes("Brian Paul") || renderer.includes("Mesa")) {
      return true;
    }

    return false;
  }

  private static hasCanvasNoise(
    components: Record<string, unknown>
  ): boolean {
    // This would require comparing multiple canvas renders
    // For now, check if canvas is suspiciously different from expected
    const canvas = components.canvas as string;
    if (!canvas || typeof canvas !== "string") return false;

    // Very short canvas data might indicate blocking
    if (canvas.length < 50) return true;

    return false;
  }

  private static hasPropertyTampering(): boolean {
    if (typeof window === "undefined") return false;

    try {
      // Check if navigator.webdriver is modified
      const descriptor = Object.getOwnPropertyDescriptor(
        Navigator.prototype,
        "webdriver"
      );

      if (descriptor && descriptor.get && descriptor.get.toString) {
        const getterStr = descriptor.get.toString();
        if (
          getterStr.includes("proxy") ||
          getterStr.includes("return false") ||
          getterStr.includes("undefined")
        ) {
          return true;
        }
      }
    } catch {
      // If it throws, might be tampered
      return true;
    }

    return false;
  }

  private static hasAudioTampering(
    components: Record<string, unknown>
  ): boolean {
    const audio = components.audio as Record<string, unknown>;
    if (!audio || audio.error) return false;

    // Check for impossible values
    const sampleRate = audio.sampleRate as number;
    if (sampleRate === 0 || sampleRate > 192000) return true;

    // Standard sample rates
    const standardRates = [8000, 11025, 16000, 22050, 44100, 48000, 96000];
    if (!standardRates.includes(sampleRate)) return true;

    return false;
  }

  private static calculateRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" {
    if (score < 30) return "LOW";
    if (score < 70) return "MEDIUM";
    return "HIGH";
  }
}
