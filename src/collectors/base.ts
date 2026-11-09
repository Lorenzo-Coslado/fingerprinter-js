import { FingerprintError } from '../types';
import type {
  CollectorCategory,
  CollectorContext,
  CollectorMetadata,
  ComponentCollector,
} from '../types';
import { isBrowser, safeGet } from '../utils';

export abstract class BaseCollector<T = unknown> implements ComponentCollector<T> {
  abstract readonly name: string;
  abstract readonly metadata: CollectorMetadata;
  abstract collect(context?: CollectorContext): Promise<T> | T;
  isSupported(): boolean {
    return isBrowser();
  }
  protected requireSupported(context?: CollectorContext): void {
    if (context?.signal.aborted)
      throw new FingerprintError(`${this.name} was cancelled`, 'ABORTED', this.name);
    if (!this.isSupported())
      throw new FingerprintError(`${this.name} is unavailable`, 'UNSUPPORTED', this.name);
  }
  protected safeCollect<R>(fn: () => R, defaultValue: R): R {
    return safeGet(fn, defaultValue);
  }
  protected static createMetadata(
    name: string,
    options: {
      weight?: number;
      entropy?: number;
      stable?: boolean;
      category?: CollectorCategory;
      description?: string;
      network?: boolean;
    } = {},
  ): CollectorMetadata {
    return {
      name,
      stable: options.stable ?? false,
      category: options.category ?? 'browser',
      description: options.description,
      network: options.network ?? false,
    };
  }
}

/** Standalone collector deadline; the orchestrator also applies a shared global budget. */
export abstract class AsyncBaseCollector<T = unknown> extends BaseCollector<T> {
  protected timeout = 5000;
  setTimeout(ms: number): this {
    if (!Number.isFinite(ms) || ms <= 0 || ms > 2147483647) {
      throw new FingerprintError('Timeout must be a positive timer-safe number', 'INVALID_INPUT');
    }
    this.timeout = ms;
    return this;
  }
  protected async withTimeout<R>(
    promise: Promise<R>,
    fallback?: R,
    signal?: AbortSignal,
  ): Promise<R> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: (() => void) | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<R>((resolve, reject) => {
          const timeout = (): void => {
            if (fallback !== undefined) resolve(fallback);
            else
              reject(
                new FingerprintError(`${this.name} timed out`, 'COLLECTOR_TIMEOUT', this.name),
              );
          };
          abort = (): void =>
            reject(new FingerprintError(`${this.name} was cancelled`, 'ABORTED', this.name));
          if (signal?.aborted) {
            abort();
            return;
          }
          signal?.addEventListener('abort', abort, { once: true });
          timer = setTimeout(timeout, this.timeout);
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      if (abort) signal?.removeEventListener('abort', abort);
    }
  }
}
