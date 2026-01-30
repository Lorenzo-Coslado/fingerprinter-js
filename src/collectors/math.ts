/**
 * Math Collector
 * Creates fingerprint based on math precision differences
 */

import { CollectorMetadata, MathData } from "../types";
import { BaseCollector } from "./base";

/**
 * Math Collector
 * Different browsers/CPUs can produce slightly different math results
 */
export class MathCollector extends BaseCollector<MathData> {
  readonly name = "math";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata("math", {
    weight: 6,
    entropy: 6,
    stable: true,
    category: "browser",
  });

  collect(): MathData {
    return this.safeCollect(
      () => ({
        tan: Math.tan(-1e300).toString(),
        sin: Math.sin(-1e300).toString(),
        atan2: Math.atan2(0.5, 0.5).toString(),
        log: Math.log(1000).toString(),
        pow: Math.pow(Math.PI, -100).toString(),
        sqrt: Math.sqrt(2).toString(),
      }),
      {
        tan: "",
        sin: "",
        atan2: "",
        log: "",
        pow: "",
        sqrt: "",
      }
    );
  }
}
