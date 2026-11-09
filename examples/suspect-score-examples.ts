import { Fingerprint, SuspectAnalyzer, type SuspectAnalysis } from 'fingerprinter-js';

/** Indicators are diagnostic input, never an authentication or fraud verdict. */
export async function inspectAutomation(): Promise<SuspectAnalysis | undefined> {
  const result = await Fingerprint.generate({ includeSuspectAnalysis: true });
  return result.suspectAnalysis;
}

/** Replay explicitly supplied observations without reading browser globals. */
export function replaySnapshot(): SuspectAnalysis {
  return SuspectAnalyzer.analyze({
    userAgent: 'Example browser',
    automation: { webdriver: false, headless: false },
  });
}
