/**
 * Base Collector Class
 * Abstract base class for all fingerprint collectors
 */

import {
    CollectorCategory,
    CollectorMetadata,
    ComponentCollector,
} from "../types";
import { isBrowser, safeGet } from "../utils";

/**
 * Abstract base class for collectors
 */
export abstract class BaseCollector<T = unknown>
  implements ComponentCollector<T>
{
  abstract readonly name: string;
  abstract readonly metadata: CollectorMetadata;

  /**
   * Collect fingerprint data
   * Override this method in subclasses
   */
  abstract collect(): Promise<T> | T;

  /**
   * Check if collector is supported
   * Override in subclasses for specific checks
   */
  isSupported(): boolean {
    return isBrowser();
  }

  /**
   * Safe collection with error handling
   */
  protected safeCollect<R>(fn: () => R, defaultValue: R): R {
    return safeGet(fn, defaultValue);
  }

  /**
   * Create metadata helper
   */
  protected static createMetadata(
    name: string,
    options: {
      weight?: number;
      entropy?: number;
      stable?: boolean;
      category?: CollectorCategory;
    } = {}
  ): CollectorMetadata {
    return {
      name,
      weight: options.weight ?? 5,
      entropy: options.entropy ?? 2,
      stable: options.stable ?? true,
      category: options.category ?? "browser",
    };
  }
}

/**
 * Async base collector with timeout support
 */
export abstract class AsyncBaseCollector<T = unknown> extends BaseCollector<T> {
  protected timeout: number = 5000;

  /**
   * Set collector timeout
   */
  setTimeout(ms: number): this {
    this.timeout = ms;
    return this;
  }

  /**
   * Wrap async operation with timeout
   */
  protected async withTimeout<R>(
    promise: Promise<R>,
    fallback: R
  ): Promise<R> {
    return Promise.race([
      promise,
      new Promise<R>((resolve) =>
        setTimeout(() => resolve(fallback), this.timeout)
      ),
    ]);
  }
}
