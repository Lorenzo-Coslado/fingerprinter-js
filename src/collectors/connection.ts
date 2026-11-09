import type { ConnectionData } from '../types';
import { BaseCollector } from './base';

interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  type?: string;
}
type ConnectionNavigator = Navigator & { connection?: NetworkInformation };
export class ConnectionCollector extends BaseCollector<ConnectionData> {
  readonly name = 'connection';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'network',
    stable: false,
  });
  isSupported(): boolean {
    return super.isSupported() && !!(navigator as ConnectionNavigator).connection;
  }
  collect(): ConnectionData {
    this.requireSupported();
    const connection = (navigator as ConnectionNavigator).connection;
    return {
      supported: true,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
      type: connection?.type,
    };
  }
}
