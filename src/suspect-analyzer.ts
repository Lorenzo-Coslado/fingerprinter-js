/**
 * Deterministic interpretation of an explicitly collected browser snapshot.
 * Scores describe heuristic indicators, not a probability or a fraud decision.
 */
export const ANALYSIS_RULES_VERSION = '3.0.0';

export type SignalCategory = 'automation' | 'bot';
export type AnalysisStatus = 'complete' | 'partial' | 'insufficient';

/** Observations collected by the caller; the analyzer never reads browser globals. */
export interface AutomationSnapshot {
  webdriver?: boolean;
  headless?: boolean;
  selenium?: boolean;
  puppeteer?: boolean;
  playwright?: boolean;
  phantom?: boolean;
  cdp?: boolean;
}

export interface SuspectSignal {
  type: 'automation' | 'declared_bot';
  /** Heuristic weight from 0 to 10, not a calibrated confidence. */
  severity: number;
  description: string;
  detected: true;
  category: SignalCategory;
  /** Names of the observations supporting this signal; no raw user agent is copied. */
  evidence: string[];
}

export interface SuspectAnalysisDetails {
  totalSignalsDetected: number;
  highSeveritySignals: number;
  automationDetected: boolean;
  inconsistenciesFound: false;
  privacyToolsDetected: false;
  evaluatedGroups: SignalCategory[];
  skippedGroups: SignalCategory[];
  inputWarnings: string[];
  note: string;
}

export interface SuspectAnalysis {
  /** Heuristic weight from 0 to 100. Zero does not establish that a visitor is human. */
  score: number;
  signals: SuspectSignal[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  /** Whether both optional observation groups were available, not an accuracy estimate. */
  status: AnalysisStatus;
  rulesVersion: string;
  details: SuspectAnalysisDetails;
}

const automationFields = [
  'webdriver',
  'headless',
  'selenium',
  'puppeteer',
  'playwright',
  'phantom',
  'cdp',
] as const;

const botSignatures = [
  /\bGooglebot\b/i,
  /\bBingbot\b/i,
  /\bDuckDuckBot\b/i,
  /\bBaiduspider\b/i,
  /\bYandexBot\b/i,
  /\bSlurp\b/i,
  /\bfacebookexternalhit\b/i,
  /\bTwitterbot\b/i,
  /\bLinkedInBot\b/i,
  /\bApplebot\b/i,
  /\bPetalBot\b/i,
  /\bScrapy\b/i,
  /(?:^|[\s;(])(?:curl|wget|python-requests)\//i,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  try {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

function readOwn(
  record: Record<string, unknown>,
  key: string,
  warnings: string[],
  label: string = key,
): unknown {
  try {
    return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
  } catch {
    warnings.push(`${label}:unreadable`);
    return undefined;
  }
}

/** Replayable analysis: identical snapshots always produce identical results. */
export class SuspectAnalyzer {
  static analyze(components: Record<string, unknown>): SuspectAnalysis {
    const warnings: string[] = [];
    const input = isRecord(components) ? components : {};
    if (input !== components) warnings.push('components:invalid');

    const uaValue = readOwn(input, 'userAgent', warnings);
    const uaAvailable =
      typeof uaValue === 'string' && uaValue.trim().length > 0 && uaValue !== 'unknown';
    if (uaValue !== undefined && !uaAvailable) warnings.push('userAgent:unavailable');
    const userAgent = uaAvailable ? uaValue.slice(0, 8192) : '';

    const snapshot = readOwn(input, 'automation', warnings);
    const automation = isRecord(snapshot) ? snapshot : {};
    if (snapshot !== undefined && !isRecord(snapshot)) warnings.push('automation:invalid');
    const snapshotError = readOwn(automation, 'error', warnings, 'automation.error');
    const evidence: string[] = [];
    let observedAutomationFields = 0;
    if (snapshotError === undefined) {
      for (const key of automationFields) {
        const value = readOwn(automation, key, warnings, `automation.${key}`);
        if (typeof value === 'boolean') {
          observedAutomationFields += 1;
          if (value) evidence.push(`automation.${key}`);
        } else if (value !== undefined) {
          warnings.push(`automation.${key}:invalid`);
        }
      }
    } else {
      warnings.push('automation:unavailable');
    }
    if (/\b(?:HeadlessChrome|Headless|PhantomJS)\b/i.test(userAgent)) {
      evidence.push('userAgent.headless');
    }

    const signals: SuspectSignal[] = [];
    if (evidence.length > 0) {
      signals.push({
        type: 'automation',
        severity: 8,
        description:
          'Explicit browser automation indicators are present; intent is not established.',
        detected: true,
        category: 'automation',
        evidence,
      });
    }
    if (botSignatures.some((pattern) => pattern.test(userAgent))) {
      signals.push({
        type: 'declared_bot',
        severity: 6,
        description:
          'The user agent declares a crawler or scripted client; its identity is unverified.',
        detected: true,
        category: 'bot',
        evidence: ['userAgent.botSignature'],
      });
    }

    const automationAvailable = observedAutomationFields > 0 || uaAvailable;
    const evaluatedGroups: SignalCategory[] = [];
    if (automationAvailable) evaluatedGroups.push('automation');
    if (uaAvailable) evaluatedGroups.push('bot');
    const skippedGroups = (['automation', 'bot'] as const).filter(
      (group) => !evaluatedGroups.includes(group),
    );
    const status: AnalysisStatus =
      uaAvailable && observedAutomationFields > 0
        ? 'complete'
        : uaAvailable || observedAutomationFields > 0
          ? 'partial'
          : 'insufficient';
    const score = Math.min(
      100,
      signals.reduce((total, signal) => total + signal.severity * 10, 0),
    );

    return {
      score,
      signals,
      riskLevel: score >= 70 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW',
      status,
      rulesVersion: ANALYSIS_RULES_VERSION,
      details: {
        totalSignalsDetected: signals.length,
        highSeveritySignals: signals.filter((signal) => signal.severity >= 8).length,
        automationDetected: signals.some((signal) => signal.category === 'automation'),
        inconsistenciesFound: false,
        privacyToolsDetected: false,
        evaluatedGroups,
        skippedGroups,
        inputWarnings: warnings,
        note: 'Heuristic indicators only. Missing indicators do not prove a human visitor; automation does not prove fraud.',
      },
    };
  }
}
