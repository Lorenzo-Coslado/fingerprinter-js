import { Fingerprint, compareFingerprints, type FingerprintResult } from 'fingerprinter-js';

/** Run from a browser event after applying the integration's collection policy. */
export async function minimalSignature(): Promise<FingerprintResult> {
  return Fingerprint.generate({ profile: 'minimal', timeBudget: 500 });
}

export async function inspectChange(previous: FingerprintResult) {
  const current = await Fingerprint.generate({ profile: 'balanced' });
  return { current, comparison: compareFingerprints(previous, current) };
}

/** Request metadata remains context; it does not create an ID per transaction. */
export async function withRequestContext(requestId: string): Promise<FingerprintResult> {
  return Fingerprint.generate({ customData: { requestId, timestamp: Date.now() } });
}

/** Cancelled collections return inspectable partial results. */
export async function boundedCollection(signal: AbortSignal): Promise<FingerprintResult> {
  return Fingerprint.generate({ timeout: 300, timeBudget: 500, signal, includeComponents: false });
}
