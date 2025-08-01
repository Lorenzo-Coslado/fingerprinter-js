/**
 * Suspect Score Analyzer
 * Analyzes suspicious signals in browser fingerprints
 */

export interface SuspectAnalysis {
  score: number; // 0-100 (0 = légitime, 100 = très suspect)
  signals: SuspectSignal[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  details: Record<string, any>;
}

export interface SuspectSignal {
  type: string;
  severity: number; // 0-10
  description: string;
  detected: boolean;
}

export class SuspectAnalyzer {
  /**
   * Analyzes a fingerprint to detect suspicious signals
   */
  static analyze(components: Record<string, any>): SuspectAnalysis {
    const signals: SuspectSignal[] = [];
    let totalScore = 0;

    // 1. Automation detection
    const automationSignals = this.checkAutomation(components);
    signals.push(...automationSignals);

    // 2. Technical inconsistencies
    const consistencySignals = this.checkConsistency(components);
    signals.push(...consistencySignals);

    // 3. Suspicious environment
    const environmentSignals = this.checkEnvironment(components);
    signals.push(...environmentSignals);

    // 4. Bot patterns
    const botSignals = this.checkBotPatterns(components);
    signals.push(...botSignals);

    // Calcul du score total
    const detectedSignals = signals.filter((s) => s.detected);
    totalScore = detectedSignals.reduce(
      (sum, signal) => sum + signal.severity * 10,
      0
    );
    totalScore = Math.min(100, totalScore); // Cap à 100

    const riskLevel = this.calculateRiskLevel(totalScore);

    return {
      score: totalScore,
      signals: detectedSignals,
      riskLevel,
      details: {
        totalSignalsDetected: detectedSignals.length,
        highSeveritySignals: detectedSignals.filter((s) => s.severity >= 8)
          .length,
        automationDetected: automationSignals.some((s) => s.detected),
        inconsistenciesFound: consistencySignals.some((s) => s.detected),
      },
    };
  }

  /**
   * Detects automation signals
   */
  private static checkAutomation(
    components: Record<string, any>
  ): SuspectSignal[] {
    const signals: SuspectSignal[] = [];

    // WebDriver detection
    signals.push({
      type: "webdriver",
      severity: 9,
      description: "WebDriver automation detected",
      detected: this.hasWebDriver(),
    });

    // Headless browser
    signals.push({
      type: "headless",
      severity: 8,
      description: "Headless browser detected",
      detected: this.isHeadless(components),
    });

    // Phantom/Automation signatures
    signals.push({
      type: "phantom",
      severity: 7,
      description: "PhantomJS signatures detected",
      detected: this.hasPhantomSignatures(components),
    });

    // Selenium signatures
    signals.push({
      type: "selenium",
      severity: 8,
      description: "Selenium signatures detected",
      detected: this.hasSeleniumSignatures(),
    });

    return signals;
  }

  /**
   * Checks data consistency
   */
  private static checkConsistency(
    components: Record<string, any>
  ): SuspectSignal[] {
    const signals: SuspectSignal[] = [];

    // Timezone vs Language inconsistency
    signals.push({
      type: "timezone_language",
      severity: 5,
      description: "Timezone/language inconsistency",
      detected: this.hasTimezoneLanguageInconsistency(components),
    });

    // Screen resolution inconsistency
    signals.push({
      type: "screen_consistency",
      severity: 6,
      description: "Screen resolution inconsistency",
      detected: this.hasScreenInconsistency(components),
    });

    // Canvas fingerprint too generic
    signals.push({
      type: "generic_canvas",
      severity: 4,
      description: "Canvas fingerprint too generic",
      detected: this.hasGenericCanvas(components),
    });

    return signals;
  }

  /**
   * Checks execution environment
   */
  private static checkEnvironment(
    components: Record<string, any>
  ): SuspectSignal[] {
    const signals: SuspectSignal[] = [];

    // Missing expected APIs
    signals.push({
      type: "missing_apis",
      severity: 6,
      description: "Missing browser APIs",
      detected: this.hasMissingAPIs(components),
    });

    // Too many errors in collection
    signals.push({
      type: "collection_errors",
      severity: 5,
      description: "Too many collection errors",
      detected: this.hasTooManyErrors(components),
    });

    // Suspicious user agent
    signals.push({
      type: "suspicious_ua",
      severity: 7,
      description: "Suspicious user agent",
      detected: this.hasSuspiciousUserAgent(components),
    });

    return signals;
  }

  /**
   * Detects bot patterns
   */
  private static checkBotPatterns(
    components: Record<string, any>
  ): SuspectSignal[] {
    const signals: SuspectSignal[] = [];

    // Perfect fingerprint (too stable)
    signals.push({
      type: "too_perfect",
      severity: 3,
      description: "Fingerprint too perfect/stable",
      detected: this.isTooStable(components),
    });

    // Known bot signatures
    signals.push({
      type: "bot_signature",
      severity: 9,
      description: "Known bot signature detected",
      detected: this.hasKnownBotSignature(components),
    });

    return signals;
  }

  // Specific detection methods
  private static hasWebDriver(): boolean {
    return (
      typeof window !== "undefined" &&
      (window.navigator as any).webdriver === true
    );
  }

  private static isHeadless(components: Record<string, any>): boolean {
    const ua = components.userAgent || "";
    return (
      ua.includes("HeadlessChrome") ||
      ua.includes("PhantomJS") ||
      (typeof window !== "undefined" && window.outerHeight === 0)
    );
  }

  private static hasPhantomSignatures(
    components: Record<string, any>
  ): boolean {
    const ua = components.userAgent || "";
    return (
      ua.includes("PhantomJS") ||
      (typeof window !== "undefined" && (window as any)._phantom)
    );
  }

  private static hasSeleniumSignatures(): boolean {
    if (typeof window === "undefined") return false;

    return !!(
      (window as any).selenium ||
      (window as any).webdriver ||
      (window.document as any).selenium ||
      (window.document as any).webdriver ||
      (window.navigator as any).webdriver
    );
  }

  private static hasTimezoneLanguageInconsistency(
    components: Record<string, any>
  ): boolean {
    const timezone = components.timezone;
    const language = components.language;

    if (!timezone || !language) return false;

    // Simplified logic - in a real system, use a database
    // of timezone/country/language mappings
    const suspiciousCombinations = [
      { tz: "America/New_York", lang: "zh-CN" },
      { tz: "Europe/Paris", lang: "ja-JP" },
      { tz: "Asia/Tokyo", lang: "es-ES" },
    ];

    return suspiciousCombinations.some(
      (combo) =>
        timezone.includes(combo.tz) &&
        Array.isArray(language) &&
        language.some((l) => l.includes(combo.lang))
    );
  }

  private static hasScreenInconsistency(
    components: Record<string, any>
  ): boolean {
    const screen = components.screen;
    if (!screen) return false;

    // Résolutions trop parfaites ou communes aux bots
    const suspiciousResolutions = [
      "1024x768",
      "800x600",
      "1280x720",
      "1920x1080",
    ];

    const resolution = `${screen.width}x${screen.height}`;
    return (
      suspiciousResolutions.includes(resolution) && screen.colorDepth === 24
    ); // Combinaison suspecte
  }

  private static hasGenericCanvas(components: Record<string, any>): boolean {
    const canvas = components.canvas;
    if (!canvas || typeof canvas !== "string") return false;

    // MD5 hashes of very common canvas (bots)
    const commonCanvasHashes = [
      "e3b0c44298fc1c149afbf4c8996fb924", // Empty canvas
      "da39a3ee5e6b4b0d3255bfef95601890", // Generic canvas
    ];

    // Simplified - in a real system, hash the canvas
    return canvas.length < 100 || canvas === "no-canvas";
  }

  private static hasMissingAPIs(components: Record<string, any>): boolean {
    const expectedAPIs = ["userAgent", "language", "screen"];
    const missingAPIs = expectedAPIs.filter(
      (api) => !components[api] || components[api].error
    );

    return missingAPIs.length > 1;
  }

  private static hasTooManyErrors(components: Record<string, any>): boolean {
    const errorCount = Object.values(components).filter(
      (value) => value && typeof value === "object" && value.error
    ).length;

    return errorCount > 3;
  }

  private static hasSuspiciousUserAgent(
    components: Record<string, any>
  ): boolean {
    const ua = components.userAgent || "";
    const suspiciousPatterns = [
      "HeadlessChrome",
      "PhantomJS",
      "bot",
      "crawler",
      "spider",
      "scraper",
    ];

    return suspiciousPatterns.some((pattern) =>
      ua.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private static isTooStable(components: Record<string, any>): boolean {
    // Si tous les composants sont parfaits, c'est suspect
    const perfectComponents = Object.values(components).filter(
      (value) => value && !value.error && value !== "unknown"
    ).length;

    return perfectComponents === Object.keys(components).length;
  }

  private static hasKnownBotSignature(
    components: Record<string, any>
  ): boolean {
    const ua = components.userAgent || "";

    // Database of known bot signatures
    const botSignatures = [
      "Googlebot",
      "Bingbot",
      "facebookexternalhit",
      "Twitterbot",
      "LinkedInBot",
      "WhatsApp",
      "python-requests",
      "curl/",
      "wget",
    ];

    return botSignatures.some((signature) => ua.includes(signature));
  }

  private static calculateRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" {
    if (score < 30) return "LOW";
    if (score < 70) return "MEDIUM";
    return "HIGH";
  }
}
