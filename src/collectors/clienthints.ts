import type { ClientHintsData, CollectorContext } from '../types';
import { AsyncBaseCollector, BaseCollector } from './base';

interface NavigatorUAData {
  brands: Array<{ brand: string; version: string }>;
  mobile: boolean;
  platform: string;
  getHighEntropyValues(hints: string[]): Promise<Partial<ClientHintsData>>;
}
type HintsNavigator = Navigator & { userAgentData?: NavigatorUAData };
export class ClientHintsCollector extends AsyncBaseCollector<ClientHintsData> {
  readonly name = 'clientHints';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'browser',
    stable: true,
  });
  constructor(private readonly options: { highEntropy?: boolean } = {}) {
    super();
  }
  isSupported(): boolean {
    return super.isSupported() && !!(navigator as HintsNavigator).userAgentData;
  }
  async collect(context?: CollectorContext): Promise<ClientHintsData> {
    this.requireSupported(context);
    const hints = (navigator as HintsNavigator).userAgentData;
    if (!hints) throw new Error('Client Hints disappeared during collection');
    const result: ClientHintsData = {
      brands: [...hints.brands].sort((a, b) => a.brand.localeCompare(b.brand)),
      mobile: hints.mobile,
      platform: hints.platform,
    };
    if (this.options.highEntropy && typeof hints.getHighEntropyValues === 'function') {
      try {
        const high = await this.withTimeout(
          hints.getHighEntropyValues([
            'architecture',
            'bitness',
            'model',
            'platformVersion',
            'fullVersionList',
          ]),
          undefined,
          context?.signal,
        );
        for (const key of ['architecture', 'bitness', 'model', 'platformVersion'] as const) {
          if (typeof high[key] === 'string') result[key] = high[key];
        }
        if (high.fullVersionList)
          result.fullVersionList = [...high.fullVersionList].sort((a, b) =>
            a.brand.localeCompare(b.brand),
          );
      } catch (error) {
        if (context?.signal.aborted) throw error;
        // Low-entropy observations are still real observations if high-entropy access is blocked.
      }
    }
    return result;
  }
}
