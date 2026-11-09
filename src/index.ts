/** Browser collection is on demand; importing the package is safe during SSR. */
export { Fingerprint, Fingerprint as default, createFingerprinter } from './fingerprint';
export * from './types';
export { SuspectAnalyzer, ANALYSIS_RULES_VERSION } from './suspect-analyzer';
export type {
  SuspectAnalysis,
  SuspectSignal,
  SignalCategory,
  AnalysisStatus,
  AutomationSnapshot,
  SuspectAnalysisDetails,
} from './suspect-analyzer';
export {
  canonicalStringify,
  safeStringify,
  sha256,
  sha256Fallback,
  simpleHash,
  isBrowser,
  safeGet,
  compareComponents,
  compareFingerprints,
} from './utils';
export * from './collectors';
export { getCollectorMetadata } from './collectors/registry';
