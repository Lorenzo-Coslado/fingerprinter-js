/**
 * Basic Collectors
 * Simple browser property collectors
 */

import { CollectorMetadata, ScreenData } from "../types";
import { BaseCollector } from "./base";

/**
 * User Agent Collector
 */
export class UserAgentCollector extends BaseCollector<string> {
  readonly name = "userAgent";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "userAgent",
    {
      weight: 8,
      entropy: 10,
      stable: true,
      category: "browser",
    }
  );

  collect(): string {
    return this.safeCollect(() => navigator.userAgent, "unknown");
  }
}

/**
 * Language Collector
 */
export class LanguageCollector extends BaseCollector<string[]> {
  readonly name = "language";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "language",
    {
      weight: 6,
      entropy: 5,
      stable: true,
      category: "browser",
    }
  );

  collect(): string[] {
    return this.safeCollect(() => {
      const languages: string[] = [];
      if (navigator.language) {
        languages.push(navigator.language);
      }
      if (navigator.languages) {
        languages.push(...navigator.languages);
      }
      return [...new Set(languages)];
    }, ["unknown"]);
  }
}

/**
 * Timezone Collector
 */
export class TimezoneCollector extends BaseCollector<string> {
  readonly name = "timezone";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "timezone",
    {
      weight: 7,
      entropy: 6,
      stable: true,
      category: "browser",
    }
  );

  collect(): string {
    return this.safeCollect(() => {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }, "unknown");
  }
}

/**
 * Screen Collector
 */
export class ScreenCollector extends BaseCollector<ScreenData> {
  readonly name = "screen";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "screen",
    {
      weight: 7,
      entropy: 8,
      stable: true,
      category: "hardware",
    }
  );

  collect(): ScreenData {
    return this.safeCollect(
      () => ({
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        devicePixelRatio: window.devicePixelRatio || 1,
      }),
      {
        width: 0,
        height: 0,
        availWidth: 0,
        availHeight: 0,
        colorDepth: 0,
        pixelDepth: 0,
        devicePixelRatio: 1,
      }
    );
  }
}

/**
 * Plugins Collector
 */
export class PluginsCollector extends BaseCollector<
  Array<{ name: string; description: string; filename: string }>
> {
  readonly name = "plugins";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "plugins",
    {
      weight: 5,
      entropy: 6,
      stable: true,
      category: "browser",
    }
  );

  collect(): Array<{ name: string; description: string; filename: string }> {
    return this.safeCollect(() => {
      const plugins: Array<{
        name: string;
        description: string;
        filename: string;
      }> = [];
      for (let i = 0; i < navigator.plugins.length; i++) {
        const plugin = navigator.plugins[i];
        plugins.push({
          name: plugin.name,
          description: plugin.description,
          filename: plugin.filename,
        });
      }
      return plugins;
    }, []);
  }
}
