import { afterEach, describe, expect, it, vi } from 'vitest';
import { Fingerprint } from '../fingerprint';
import type { ComponentCollector, FingerprintOptions } from '../types';
import { compareFingerprints } from '../utils';
import schemaFixture from './schema-v3.fixture.json';

const fixture = (value: unknown, project?: (value: unknown) => unknown): ComponentCollector => ({
  name: 'fixture',
  metadata: { name: 'fixture', category: 'browser', stable: !!project },
  isSupported: () => true,
  collect: () => value,
  ...(project ? { project } : {}),
});
const generate = (options: FingerprintOptions = {}) =>
  Fingerprint.generate({ collectors: [], ...options });
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('schema 3 identity contract', () => {
  it('matches the checked-in schema 3 golden identity', async () => {
    const result = await generate({
      collectors: [],
      fingerprintData: schemaFixture.options.fingerprintData,
    });
    expect(result.fingerprintVersion).toBe(schemaFixture.fingerprintVersion);
    expect(result.fingerprint).toBe(schemaFixture.expected);
  });
  it('matches the checked-in built-in screen projection fixture', async () => {
    vi.stubGlobal('screen', schemaFixture.screenProjection.screen);
    const result = await generate({ collectors: ['screen'] });
    expect(result.hashComponents).toEqual(['screen']);
    expect(result.fingerprint).toBe(schemaFixture.screenProjection.expected);
  });
  it('preserves UUIDs and timestamps as context without hashing them', async () => {
    const a = { userId: '123e4567-e89b-12d3-a456-426614174000', nested: { timestamp: 1 } };
    const b = { userId: '987e6543-e21b-12d3-a456-426614174999', nested: { timestamp: 2 } };
    const first = await generate({ customData: a });
    const second = await generate({ customData: b, allowUnstableData: false });
    expect(first.components.custom).toEqual(a);
    expect(second.components.custom).toEqual(b);
    expect(first.fingerprint).toBe(second.fingerprint);
  });
  it('hashes explicit UUID data and detects a changed identity field', async () => {
    const first = await generate({
      fingerprintData: { userId: '123e4567-e89b-12d3-a456-426614174000', a: 1 },
    });
    const reordered = await generate({
      fingerprintData: { a: 1, userId: '123e4567-e89b-12d3-a456-426614174000' },
    });
    const changed = await generate({
      fingerprintData: { userId: '987e6543-e21b-12d3-a456-426614174999', a: 1 },
    });
    expect(first.fingerprint).toBe(reordered.fingerprint);
    expect(first.fingerprint).not.toBe(changed.fingerprint);
    expect(first.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(first.fingerprintVersion).toBe('3');
  });
  it('excludes volatile fields via an explicit projection', async () => {
    const project = (value: unknown): unknown => ({ stable: (value as { stable: string }).stable });
    const first = await generate({
      customCollectors: [fixture({ stable: 'a', volatile: 1 }, project)],
    });
    const volatileChanged = await generate({
      customCollectors: [fixture({ stable: 'a', volatile: 2 }, project)],
    });
    const identityChanged = await generate({
      customCollectors: [fixture({ stable: 'b', volatile: 2 }, project)],
    });
    expect(first.fingerprint).toBe(volatileChanged.fingerprint);
    expect(first.fingerprint).not.toBe(identityChanged.fingerprint);
    expect(first.hashComponents).toEqual(['fixture']);
    expect(compareFingerprints(first, volatileChanged)).toMatchObject({
      sameFingerprint: true,
      sameVersion: true,
    });
    expect(compareFingerprints(first, volatileChanged).changes).toHaveLength(1);
  });
  it('never guesses a custom projection from metadata.stable', async () => {
    const a = fixture('a');
    a.metadata.stable = true;
    const b = fixture('b');
    b.metadata.stable = true;
    const [first, second] = await Promise.all([
      generate({ customCollectors: [a] }),
      generate({ customCollectors: [b] }),
    ]);
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.hashComponents).toEqual([]);
    expect(first.quality).toBe('empty');
  });
  it('separates namespaces', async () => {
    const [a, b] = await Promise.all([
      generate({ namespace: 'app-a' }),
      generate({ namespace: 'app-b' }),
    ]);
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });
  it('does not let display or execution options enter the identity recipe', async () => {
    const customCollectors = [fixture({ stable: true }, (value) => value)];
    const a = await generate({
      customCollectors,
      timeout: 1000,
      timeBudget: 1000,
      includeComponents: true,
    });
    const b = await generate({
      customCollectors,
      timeout: 2000,
      timeBudget: 2000,
      includeComponents: false,
      parallel: false,
    });
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(b.components).toEqual({});
    expect(b.collectorResults.fixture).toEqual({ status: 'ok', duration: expect.any(Number) });
    expect(JSON.stringify(b)).not.toContain('"stable":true');
  });
  it('snapshots caller data so mutations after construction do not change the recipe', async () => {
    const input = { a: { value: 1 } };
    const fp = new Fingerprint({ collectors: [], fingerprintData: input });
    input.a.value = 2;
    const first = await fp.generate();
    const expected = await generate({ fingerprintData: { a: { value: 1 } } });
    expect(first.fingerprint).toBe(expected.fingerprint);
    expect(first.fingerprint).not.toBe((await generate({ fingerprintData: input })).fingerprint);
  });
});
