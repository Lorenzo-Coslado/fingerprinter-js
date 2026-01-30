/**
 * Connection Collector
 * Collects network connection information
 */

import { CollectorMetadata, ConnectionData } from "../types";
import { BaseCollector } from "./base";

interface NetworkInformation {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  type?: string;
}

/**
 * Connection Collector
 * Uses Network Information API
 */
export class ConnectionCollector extends BaseCollector<ConnectionData> {
  readonly name = "connection";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "connection",
    {
      weight: 4,
      entropy: 4,
      stable: false, // Connection can change
      category: "network",
    }
  );

  isSupported(): boolean {
    return (
      super.isSupported() &&
      "connection" in navigator
    );
  }

  collect(): ConnectionData {
    if (!this.isSupported()) {
      return { supported: false };
    }

    return this.safeCollect<ConnectionData>(
      (): ConnectionData => {
        const connection = (navigator as any).connection as NetworkInformation;

        return {
          supported: true,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
          type: connection.type,
        };
      },
      { supported: false }
    );
  }
}
