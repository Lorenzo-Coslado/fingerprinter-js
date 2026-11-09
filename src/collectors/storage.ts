import type { CollectorContext, StorageData } from '../types';
import { AsyncBaseCollector, BaseCollector } from './base';

let probeSequence = 0;
/** Probes use a per-invocation unused key and always clean up their own write. */
export class StorageCollector extends AsyncBaseCollector<StorageData> {
  readonly name = 'storage';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'storage',
    stable: false,
  });

  private probe(getStorage: () => Storage): boolean {
    let storage: Storage | undefined;
    let key: string | undefined;
    let written = false;
    try {
      storage = getStorage();
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = `__fingerprinter_probe_${Date.now()}_${++probeSequence}`;
        if (storage.getItem(candidate) === null) {
          key = candidate;
          break;
        }
      }
      if (!key) return false;
      storage.setItem(key, key);
      written = true;
      return storage.getItem(key) === key;
    } catch {
      return false;
    } finally {
      if (written && storage && key) {
        try {
          if (storage.getItem(key) === key) storage.removeItem(key);
        } catch {
          /* storage policy changed */
        }
      }
    }
  }
  async collect(context?: CollectorContext): Promise<StorageData> {
    this.requireSupported(context);
    const data: StorageData = {
      localStorage: this.probe(() => window.localStorage),
      sessionStorage: this.probe(() => window.sessionStorage),
      indexedDB: typeof indexedDB !== 'undefined' && typeof indexedDB.open === 'function',
      cookiesEnabled: navigator.cookieEnabled,
      quotaEstimate: null,
    };
    if (navigator.storage?.estimate) {
      try {
        const estimate = await this.withTimeout(
          navigator.storage.estimate(),
          undefined,
          context?.signal,
        );
        data.quotaEstimate = typeof estimate.quota === 'number' ? estimate.quota : null;
      } catch (error) {
        if (context?.signal.aborted) throw error;
        // Availability checks remain useful if quota access is denied or unavailable.
      }
    }
    return data;
  }
}
