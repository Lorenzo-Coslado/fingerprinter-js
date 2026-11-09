import { FingerprintError } from './types';
import type { ComponentChange, FingerprintComparison, FingerprintResult } from './types';

/** Legacy non-cryptographic helper. Never used to generate an identity hash. */
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (Math.imul(hash, 31) + str.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/** Canonical JSON: sorted object keys, ordered arrays, no cycles or non-JSON objects. */
export function safeStringify(value: unknown): string {
  const ancestors = new Set<object>();
  const visit = (item: unknown, depth: number): string => {
    if (depth > 100) throw new FingerprintError('JSON nesting exceeds 100 levels', 'INVALID_INPUT');
    if (item === null) return 'null';
    if (typeof item === 'string' || typeof item === 'boolean') return JSON.stringify(item);
    if (typeof item === 'number' && Number.isFinite(item)) return JSON.stringify(item);
    if (typeof item !== 'object')
      throw new FingerprintError('Expected finite JSON values', 'INVALID_INPUT');
    if (ancestors.has(item))
      throw new FingerprintError('Circular JSON data is not supported', 'INVALID_INPUT');
    const prototype: unknown = Object.getPrototypeOf(item);
    if (!Array.isArray(item) && prototype !== Object.prototype && prototype !== null) {
      throw new FingerprintError(
        'Only plain JSON objects and arrays are supported',
        'INVALID_INPUT',
      );
    }
    ancestors.add(item);
    try {
      if (Array.isArray(item))
        return `[${Array.from(item, (entry) => visit(entry, depth + 1)).join(',')}]`;
      const object = item as Record<string, unknown>;
      return `{${Object.keys(object)
        .sort()
        .filter((key) => object[key] !== undefined)
        .map((key) => `${JSON.stringify(key)}:${visit(object[key], depth + 1)}`)
        .join(',')}}`;
    } finally {
      ancestors.delete(item);
    }
  };
  return visit(value, 0);
}

/** Alias spelling the serialization contract explicitly. */
export const canonicalStringify = safeStringify;

function utf8(message: string): Uint8Array<ArrayBuffer> {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(message);
  const bytes: number[] = [];
  for (const character of message) {
    let code = character.codePointAt(0) ?? 0xfffd;
    if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000)
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
  }
  return new Uint8Array(bytes);
}

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
const rotate = (word: number, n: number): number => (word >>> n) | (word << (32 - n));

/** Standards-compatible SHA-256 fallback, also available for known-vector verification. */
export function sha256Fallback(message: string): string {
  const input = utf8(message);
  const padded = new Uint8Array(Math.ceil((input.length + 9) / 64) * 64);
  padded.set(input);
  padded[input.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bits = input.length * 8;
  view.setUint32(padded.length - 8, Math.floor(bits / 0x100000000));
  view.setUint32(padded.length - 4, bits >>> 0);
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const words = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) words[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = words[i - 15],
        b = words[i - 2];
      words[i] =
        (words[i - 16] +
          (rotate(a, 7) ^ rotate(a, 18) ^ (a >>> 3)) +
          words[i - 7] +
          (rotate(b, 17) ^ rotate(b, 19) ^ (b >>> 10))) >>>
        0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let i = 0; i < 64; i++) {
      const first =
        (h +
          (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) +
          ((e & f) ^ (~e & g)) +
          K[i] +
          words[i]) >>>
        0;
      const second =
        ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + first) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (first + second) >>> 0;
    }
    [a, b, c, d, e, f, g, h].forEach((word, i) => {
      hash[i] = (hash[i] + word) >>> 0;
    });
  }
  return hash.map((word) => word.toString(16).padStart(8, '0')).join('');
}

/** Always returns genuine SHA-256, including outside secure contexts. */
export async function sha256(message: string): Promise<string> {
  if (typeof message !== 'string')
    throw new FingerprintError('Hash input must be a string', 'INVALID_INPUT');
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', utf8(message));
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
        '',
      );
    }
  } catch {
    /* Policy may disable Web Crypto; the fallback uses the same algorithm. */
  }
  return sha256Fallback(message);
}

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
export function safeGet<T>(fn: () => T, defaultValue: T): T {
  try {
    return fn();
  } catch {
    return defaultValue;
  }
}
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
    return error.message;
  try {
    return String(error);
  } catch {
    return 'Unknown collection error';
  }
}
export function compareComponents(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): ComponentChange[] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap((name) => {
    const previous = Object.prototype.hasOwnProperty.call(before, name);
    const next = Object.prototype.hasOwnProperty.call(after, name);
    if (previous && next && safeStringify(before[name]) === safeStringify(after[name])) return [];
    return [
      {
        name,
        type: !previous ? ('added' as const) : !next ? ('removed' as const) : ('changed' as const),
        ...(previous ? { before: before[name] } : {}),
        ...(next ? { after: after[name] } : {}),
      },
    ];
  });
}
export function compareFingerprints(
  before: FingerprintResult,
  after: FingerprintResult,
): FingerprintComparison {
  return {
    sameFingerprint: before.fingerprint === after.fingerprint,
    sameVersion: before.fingerprintVersion === after.fingerprintVersion,
    changes: compareComponents(before.components, after.components),
  };
}
