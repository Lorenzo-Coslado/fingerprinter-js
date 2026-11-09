import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('uses real SHA-256 for ASCII and Unicode browser inputs', async ({ page }) => {
  for (const message of ['abc', 'FingerprinterJS — 日本語 🎨']) {
    const actual = await page.evaluate(async (message) => {
      const url = '/sdk/index.js';
      const { sha256 } = await import(url);
      return sha256(message);
    }, message);
    expect(actual).toBe(createHash('sha256').update(message).digest('hex'));
  }
});

test('canonicalizes identification input and preserves UUID distinctions', async ({ page }) => {
  const results = await page.evaluate(async () => {
    const url = '/sdk/index.js';
    const { Fingerprint } = await import(url);
    const base = { collectors: [] };
    const ordered = await Fingerprint.generate({
      ...base,
      fingerprintData: { a: 1, nested: { z: 3, b: 2 } },
    });
    const reordered = await Fingerprint.generate({
      ...base,
      fingerprintData: { nested: { b: 2, z: 3 }, a: 1 },
    });
    const changed = await Fingerprint.generate({
      ...base,
      fingerprintData: { a: 2, nested: { z: 3, b: 2 } },
    });
    const uuidA = await Fingerprint.generate({
      ...base,
      fingerprintData: { userId: '123e4567-e89b-12d3-a456-426614174000' },
    });
    const uuidB = await Fingerprint.generate({
      ...base,
      fingerprintData: { userId: '987e6543-e21b-12d3-a456-426614174999' },
    });
    const contextA = await Fingerprint.generate({
      ...base,
      customData: { requestId: 'a', timestamp: 1 },
    });
    const contextB = await Fingerprint.generate({
      ...base,
      customData: { requestId: 'b', timestamp: 2 },
    });
    return {
      ordered: ordered.fingerprint,
      reordered: reordered.fingerprint,
      changed: changed.fingerprint,
      uuidA: uuidA.fingerprint,
      uuidB: uuidB.fingerprint,
      contextA: contextA.fingerprint,
      contextB: contextB.fingerprint,
      preserved: contextB.components.custom,
    };
  });
  expect(results.ordered).toBe(results.reordered);
  expect(results.ordered).not.toBe(results.changed);
  expect(results.uuidA).not.toBe(results.uuidB);
  expect(results.contextA).toBe(results.contextB);
  expect(results.preserved).toEqual({ requestId: 'b', timestamp: 2 });
});

test('returns a repeatable versioned signature with inspectable collection states', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const url = '/sdk/index.js';
    const { Fingerprint } = await import(url);
    const a = await Fingerprint.generate({ profile: 'balanced', includeSuspectAnalysis: true });
    const b = await Fingerprint.generate({ profile: 'balanced', includeSuspectAnalysis: true });
    return {
      a: a.fingerprint,
      b: b.fingerprint,
      schema: a.fingerprintVersion,
      version: a.version,
      coverage: a.collectionCoverage,
      entropy: a.entropy,
      statuses: Object.values(a.collectorResults).map((v: any) => v.status),
      analysis: a.suspectAnalysis,
    };
  });
  expect(result.a).toMatch(/^[0-9a-f]{64}$/);
  expect(result.a).toBe(result.b);
  expect(result.schema).toBe('3');
  expect(result.version).toBe('3.0.0');
  expect(result.coverage).toBeGreaterThanOrEqual(0);
  expect(result.coverage).toBeLessThanOrEqual(100);
  expect(result.entropy).toBeNull();
  expect(
    result.statuses.every((s) =>
      ['ok', 'unsupported', 'blocked', 'timeout', 'error', 'excluded', 'aborted'].includes(s),
    ),
  ).toBe(true);
  expect(result.analysis.rulesVersion).toBe('3.0.0');
});

test('preserves existing application storage and handles an empty selection', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const url = '/sdk/index.js';
    const { Fingerprint } = await import(url);
    localStorage.setItem('__fp_test__', 'application-local');
    sessionStorage.setItem('__fp_test__', 'application-session');
    await Fingerprint.generate({ collectors: ['storage'] });
    const empty = await Fingerprint.generate({ collectors: [] });
    return {
      local: localStorage.getItem('__fp_test__'),
      session: sessionStorage.getItem('__fp_test__'),
      emptyCoverage: empty.collectionCoverage,
      finite: Number.isFinite(empty.confidence),
    };
  });
  expect(result.local).toBe('application-local');
  expect(result.session).toBe('application-session');
  expect(result.emptyCoverage).toBe(0);
  expect(result.finite).toBe(true);
});

test('time-bounds a never-settling custom collector', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const url = '/sdk/index.js';
    const { Fingerprint } = await import(url);
    const started = performance.now();
    const result = await Fingerprint.generate({
      collectors: [],
      timeout: 25,
      timeBudget: 100,
      customCollectors: [
        {
          name: 'hanging',
          metadata: { name: 'hanging', category: 'browser', stable: false, weight: 0, entropy: 0 },
          isSupported: () => true,
          collect: () => new Promise(() => {}),
        },
      ],
    });
    return {
      duration: performance.now() - started,
      status: result.collectorResults.hanging.status,
      coverage: result.collectionCoverage,
    };
  });
  expect(result.status).toBe('timeout');
  expect(result.coverage).toBe(0);
  expect(result.duration).toBeLessThan(1_000);
});

test('does not make third-party HTTP requests on load or default generation', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url());
  });
  await page.reload();
  await page.evaluate(async () => {
    const url = '/sdk/index.js';
    const { Fingerprint } = await import(url);
    await Fingerprint.generate();
  });
  expect(external).toEqual([]);
});

test('rejects synchronous observations returned after their local deadline', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const url = '/sdk/index.js';
    const { Fingerprint } = await import(url);
    const observation = await Fingerprint.generate({
      collectors: [],
      timeout: 10,
      timeBudget: 500,
      customCollectors: [
        {
          name: 'synchronous',
          metadata: { name: 'synchronous', category: 'browser', stable: true },
          isSupported: () => true,
          collect: () => {
            const until = performance.now() + 30;
            while (performance.now() < until) {
              /* The browser cannot preempt synchronous work. */
            }
            return 'late';
          },
          project: (value: string) => value,
        },
      ],
    });
    return {
      status: observation.collectorResults.synchronous.status,
      hashInputs: observation.hashComponents,
      coverage: observation.collectionCoverage,
    };
  });
  expect(result.status).toBe('timeout');
  expect(result.hashInputs).toEqual([]);
  expect(result.coverage).toBe(0);
});
