/**
 * Storage Collector
 * Detects available storage mechanisms
 */

import { CollectorMetadata, StorageData } from "../types";
import { AsyncBaseCollector, BaseCollector } from "./base";

/**
 * Storage Collector
 * Checks for localStorage, sessionStorage, IndexedDB, and cookies
 */
export class StorageCollector extends AsyncBaseCollector<StorageData> {
  readonly name = "storage";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "storage",
    {
      weight: 5,
      entropy: 4,
      stable: true,
      category: "storage",
    }
  );

  async collect(): Promise<StorageData> {
    return {
      localStorage: this.checkLocalStorage(),
      sessionStorage: this.checkSessionStorage(),
      indexedDB: this.checkIndexedDB(),
      cookiesEnabled: this.checkCookies(),
      quotaEstimate: await this.getQuotaEstimate(),
    };
  }

  private checkLocalStorage(): boolean {
    try {
      const test = "__fp_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private checkSessionStorage(): boolean {
    try {
      const test = "__fp_test__";
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private checkIndexedDB(): boolean {
    try {
      return (
        typeof indexedDB !== "undefined" &&
        typeof indexedDB.open === "function"
      );
    } catch {
      return false;
    }
  }

  private checkCookies(): boolean {
    try {
      return navigator.cookieEnabled;
    } catch {
      return false;
    }
  }

  private async getQuotaEstimate(): Promise<number | null> {
    try {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.quota || null;
      }
      return null;
    } catch {
      return null;
    }
  }
}
