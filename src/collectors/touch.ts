import type { TouchData } from '../types';
import { BaseCollector } from './base';

export class TouchCollector extends BaseCollector<TouchData> {
  readonly name = 'touch';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'hardware',
    stable: true,
  });
  collect(): TouchData {
    this.requireSupported();
    return {
      maxTouchPoints: navigator.maxTouchPoints || 0,
      touchEvent: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      pointerEvent: 'PointerEvent' in window,
      coarsePrimaryPointer:
        typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches,
    };
  }
}
