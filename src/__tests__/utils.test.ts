import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import {
  canonicalStringify,
  compareComponents,
  safeGet,
  safeStringify,
  sha256,
  sha256Fallback,
  simpleHash,
} from '../utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SHA-256', () => {
  const vectors = [
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    [
      'The quick brown fox jumps over the lazy dog',
      'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
    ],
  ];
  it.each(vectors)('matches a known vector for %j', async (input, expected) => {
    expect(await sha256(input)).toBe(expected);
    expect(sha256Fallback(input)).toBe(expected);
  });
  it.each(['été 🎨 日本語', '\ud800', '\udc00', 'a'.repeat(1000000)])(
    'matches independent Node crypto for UTF-8 and long data',
    async (input) => {
      const expected = createHash('sha256').update(input).digest('hex');
      expect(await sha256(input)).toBe(expected);
      expect(sha256Fallback(input)).toBe(expected);
    },
  );
  it('keeps genuine SHA-256 when crypto and TextEncoder are absent', async () => {
    vi.stubGlobal('crypto', undefined);
    vi.stubGlobal('TextEncoder', undefined);
    expect(await sha256('abc')).toBe(vectors[1][1]);
    expect(await sha256('Aa')).not.toBe(await sha256('BB'));
    expect(await sha256('🎨\ud800')).toBe(createHash('sha256').update('🎨\ud800').digest('hex'));
  });
  it('uses SHA-256 fallback when Web Crypto rejects', async () => {
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn().mockRejectedValue(new Error('Policy')) } });
    expect(await sha256('abc')).toBe(vectors[1][1]);
  });
});

describe('canonical JSON', () => {
  it('sorts keys recursively while preserving array order and changed values', () => {
    expect(safeStringify({ b: [{ z: 2, a: 1 }], a: 0 })).toBe('{"a":0,"b":[{"a":1,"z":2}]}');
    expect(canonicalStringify({ a: 1, b: 2 })).toBe(canonicalStringify({ b: 2, a: 1 }));
    expect(canonicalStringify({ a: 2, b: 2 })).not.toBe(canonicalStringify({ a: 1, b: 2 }));
    expect(canonicalStringify([1, 2])).not.toBe(canonicalStringify([2, 1]));
  });
  it('accepts repeated references but rejects actual cycles', () => {
    const shared = { value: 1 };
    expect(safeStringify({ a: shared, b: shared })).toBe(
      safeStringify({ a: { value: 1 }, b: { value: 1 } }),
    );
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => safeStringify(circular)).toThrow('Circular');
  });
  it.each(
    [
      1n,
      Infinity,
      NaN,
      new Date(),
      new Map(),
      undefined,
      () => 1,
      Symbol('x'),
      [undefined],
      Array(1),
    ].map((value, index) => ({ value, index })),
  )('rejects non-JSON case $index', ({ value }) => {
    expect(() => safeStringify(value)).toThrow();
  });
  it('omits optional undefined object members without changing their siblings', () => {
    expect(safeStringify({ a: undefined, b: null })).toBe('{"b":null}');
  });
  it('limits excessive nesting', () => {
    let value: unknown = null;
    for (let i = 0; i < 102; i++) value = { value };
    expect(() => safeStringify(value)).toThrow('100 levels');
  });
});

describe('comparison and compatibility helpers', () => {
  it('reports added, removed and changed components with canonical equality', () => {
    expect(
      compareComponents(
        { same: { a: 1, b: 2 }, old: true, changed: 1 },
        { same: { b: 2, a: 1 }, added: true, changed: 2 },
      ),
    ).toEqual([
      { name: 'added', type: 'added', after: true },
      { name: 'changed', type: 'changed', before: 1, after: 2 },
      { name: 'old', type: 'removed', before: true },
    ]);
  });
  it('retains explicitly non-cryptographic and safe accessor helpers', () => {
    expect(simpleHash('value')).toBe(simpleHash('value'));
    expect(simpleHash('')).toBe(0);
    expect(safeGet(() => 'yes', 'no')).toBe('yes');
    expect(
      safeGet(() => {
        throw new Error('no');
      }, 'fallback'),
    ).toBe('fallback');
  });
});
