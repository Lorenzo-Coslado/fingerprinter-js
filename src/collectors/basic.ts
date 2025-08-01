import { ComponentCollector } from "../types";
import { safeGet } from "../utils";

export class UserAgentCollector implements ComponentCollector {
  name = "userAgent";

  collect(): string {
    return safeGet(() => navigator.userAgent, "unknown");
  }
}

export class LanguageCollector implements ComponentCollector {
  name = "language";

  collect(): string[] {
    return safeGet(() => {
      const languages = [];
      if (navigator.language) {
        languages.push(navigator.language);
      }
      if (navigator.languages) {
        languages.push(...navigator.languages);
      }
      return [...new Set(languages)]; // Remove duplicates
    }, ["unknown"]);
  }
}

export class TimezoneCollector implements ComponentCollector {
  name = "timezone";

  collect(): string {
    return safeGet(() => {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }, "unknown");
  }
}

export class ScreenCollector implements ComponentCollector {
  name = "screen";

  collect(): object {
    return safeGet(
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

export class PluginsCollector implements ComponentCollector {
  name = "plugins";

  collect(): Array<{ name: string; description: string; filename: string }> {
    return safeGet(() => {
      const plugins = [];
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
