import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';

// Exercise real encoders and SHA-256, never a constant fingerprint mock.
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder, configurable: true });
Object.defineProperty(globalThis, 'TextDecoder', { value: TextDecoder, configurable: true });
