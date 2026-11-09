import type { MathData } from '../types';
import { BaseCollector } from './base';

export class MathCollector extends BaseCollector<MathData> {
  readonly name = 'math';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'hardware',
    stable: true,
  });
  collect(): MathData {
    this.requireSupported();
    return {
      tan: Math.tan(-1e300).toString(),
      sin: Math.sin(-1e300).toString(),
      atan2: Math.atan2(0.5, 0.5).toString(),
      log: Math.log(1000).toString(),
      pow: Math.pow(Math.PI, -100).toString(),
      sqrt: Math.sqrt(2).toString(),
    };
  }
}
