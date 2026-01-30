/**
 * Touch Collector
 * Collects touch and pointer capabilities
 */

import { CollectorMetadata, TouchData } from "../types";
import { BaseCollector } from "./base";

/**
 * Touch Collector
 * Detects touch screen capabilities
 */
export class TouchCollector extends BaseCollector<TouchData> {
  readonly name = "touch";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata("touch", {
    weight: 5,
    entropy: 4,
    stable: true,
    category: "hardware",
  });

  collect(): TouchData {
    return this.safeCollect(
      () => ({
        maxTouchPoints: navigator.maxTouchPoints || 0,
        touchEvent: "ontouchstart" in window || navigator.maxTouchPoints > 0,
        pointerEvent: "PointerEvent" in window,
        coarsePrimaryPointer: this.checkCoarsePointer(),
      }),
      {
        maxTouchPoints: 0,
        touchEvent: false,
        pointerEvent: false,
        coarsePrimaryPointer: false,
      }
    );
  }

  private checkCoarsePointer(): boolean {
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  }
}
