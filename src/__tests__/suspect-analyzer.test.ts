import { describe, expect, it, vi } from 'vitest';
import { ANALYSIS_RULES_VERSION, SuspectAnalyzer } from '../suspect-analyzer';

const normal = {
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
  language: ['ja-JP', 'fr-FR'],
  timezone: 'Europe/Paris',
  screen: { width: 1024, height: 768, colorDepth: 24 },
  hardware: { platform: 'MacIntel', hardwareConcurrency: 8, deviceMemory: null },
  automation: { webdriver: false, selenium: false, playwright: false },
};

describe('SuspectAnalyzer', () => {
  it('does not penalize a successful multilingual collection, common screen size or unavailable APIs', () => {
    const result = SuspectAnalyzer.analyze({
      ...normal,
      battery: { supported: false },
      connection: { supported: false },
      permissions: {},
      canvas: 'no-canvas',
      webgl: { vendor: 'Mesa', renderer: 'llvmpipe' },
    });
    expect(result).toMatchObject({
      score: 0,
      signals: [],
      riskLevel: 'LOW',
      status: 'complete',
      rulesVersion: ANALYSIS_RULES_VERSION,
      details: { privacyToolsDetected: false, inconsistenciesFound: false },
    });
  });

  it('marks empty or excluded observations as insufficient rather than suspicious', () => {
    expect(SuspectAnalyzer.analyze({})).toMatchObject({
      score: 0,
      status: 'insufficient',
      signals: [],
    });
    expect(SuspectAnalyzer.analyze({ language: ['en'] })).toMatchObject({
      score: 0,
      status: 'insufficient',
    });
    expect(SuspectAnalyzer.analyze({ userAgent: normal.userAgent })).toMatchObject({
      score: 0,
      status: 'partial',
    });
    expect(SuspectAnalyzer.analyze({ automation: { webdriver: false } })).toMatchObject({
      score: 0,
      status: 'partial',
    });
  });

  it('groups correlated WebDriver, tool and headless observations into one signal', () => {
    const result = SuspectAnalyzer.analyze({
      ...normal,
      userAgent: 'Mozilla/5.0 HeadlessChrome/130.0.0.0',
      automation: {
        webdriver: true,
        selenium: true,
        puppeteer: true,
        playwright: true,
        headless: true,
      },
    });
    expect(result.score).toBe(80);
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0]).toMatchObject({
      type: 'automation',
      category: 'automation',
      severity: 8,
    });
    expect(result.signals[0]?.evidence).toEqual([
      'automation.webdriver',
      'automation.headless',
      'automation.selenium',
      'automation.puppeteer',
      'automation.playwright',
      'userAgent.headless',
    ]);
  });

  it.each(['HeadlessChrome/130.0', 'PhantomJS/2.1', 'HEADLESS'])(
    'reports explicit automation in %s',
    (userAgent) => {
      const result = SuspectAnalyzer.analyze({ userAgent });
      expect(result).toMatchObject({ status: 'partial', score: 80, riskLevel: 'HIGH' });
      expect(result.signals[0]?.type).toBe('automation');
    },
  );

  it.each(['Googlebot/2.1', 'bingbot/2.0', 'curl/8.0', 'python-requests/2.32'])(
    'labels %s as a declaration rather than authenticated identity',
    (userAgent) => {
      const result = SuspectAnalyzer.analyze({ userAgent });
      expect(result.score).toBe(60);
      expect(result.signals).toEqual([expect.objectContaining({ type: 'declared_bot' })]);
      expect(result.signals[0]?.description).toContain('unverified');
    },
  );

  it('does not treat an application WebView name as a bot signature', () => {
    expect(SuspectAnalyzer.analyze({ userAgent: 'WhatsApp/2.0' }).score).toBe(0);
    expect(SuspectAnalyzer.analyze({ userAgent: 'MyRoboticsBrowser/2.0' }).score).toBe(0);
  });

  it('is replayable and independent of current browser globals', () => {
    const before = SuspectAnalyzer.analyze(normal);
    vi.stubGlobal('navigator', { webdriver: true });
    vi.stubGlobal('window', { __playwright: true, outerWidth: 0, outerHeight: 0 });
    try {
      expect(SuspectAnalyzer.analyze(normal)).toEqual(before);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(before.details.note).toContain('Missing indicators do not prove a human');
  });

  it('does not infer a tool when the snapshot only contains WebDriver', () => {
    const result = SuspectAnalyzer.analyze({ automation: { webdriver: true } });
    expect(result.signals[0]?.evidence).toEqual(['automation.webdriver']);
    expect(result.signals[0]?.type).toBe('automation');
  });

  it('does not coerce strings, numbers or errors into automation observations', () => {
    const result = SuspectAnalyzer.analyze({
      userAgent: 123,
      automation: { webdriver: 'true', playwright: 1 },
    });
    expect(result).toMatchObject({ score: 0, status: 'insufficient' });
    expect(result.details.inputWarnings).toEqual([
      'userAgent:unavailable',
      'automation.webdriver:invalid',
      'automation.playwright:invalid',
    ]);
    expect(
      SuspectAnalyzer.analyze({ automation: { error: 'blocked', webdriver: true } }),
    ).toMatchObject({
      score: 0,
      status: 'insufficient',
    });
  });

  it('reports unreadable getters without throwing or evaluating unrelated data', () => {
    const input: Record<string, unknown> = { userAgent: normal.userAgent };
    Object.defineProperty(input, 'automation', {
      get() {
        throw new Error('blocked');
      },
    });
    Object.defineProperty(input, 'canvas', {
      get() {
        throw new Error('must not be read');
      },
    });
    const result = SuspectAnalyzer.analyze(input);
    expect(result).toMatchObject({ score: 0, status: 'partial' });
    expect(result.details.inputWarnings).toEqual(['automation:unreadable']);
  });

  it('does not inherit observation flags from prototypes', () => {
    const automation: Record<string, unknown> = Object.create({ webdriver: true });
    expect(SuspectAnalyzer.analyze({ userAgent: normal.userAgent, automation }).score).toBe(0);
  });

  it('reports invalid untyped input without throwing', () => {
    const invalidInputs: unknown[] = [null, undefined, true, 1, 'userAgent', []];
    for (const input of invalidInputs) {
      // @ts-expect-error Deliberately exercise invalid input from an untyped JavaScript caller.
      const result = SuspectAnalyzer.analyze(input);
      expect(result).toMatchObject({ score: 0, status: 'insufficient' });
      expect(result.details.inputWarnings).toEqual(['components:invalid']);
    }
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    expect(SuspectAnalyzer.analyze(proxy)).toMatchObject({ score: 0, status: 'insufficient' });
  });

  it('ignores unrelated metadata when replaying a snapshot', () => {
    expect(SuspectAnalyzer.analyze(normal)).toEqual(
      SuspectAnalyzer.analyze({
        ...normal,
        custom: { transactionId: 'one' },
        permissions: { camera: 'denied' },
      }),
    );
  });

  it('bounds the score when independent groups are present', () => {
    const result = SuspectAnalyzer.analyze({
      userAgent: 'Googlebot/2.1',
      automation: { webdriver: true },
    });
    expect(result.score).toBe(100);
    expect(result.signals).toHaveLength(2);
    expect(result.details.totalSignalsDetected).toBe(2);
  });
});
