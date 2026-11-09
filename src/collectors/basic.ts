import type { ScreenData } from '../types';
import { BaseCollector } from './base';

export class UserAgentCollector extends BaseCollector<string> {
  readonly name = 'userAgent';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'browser',
    stable: false,
  });
  collect(): string {
    this.requireSupported();
    return navigator.userAgent;
  }
}
export class LanguageCollector extends BaseCollector<string[]> {
  readonly name = 'language';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'browser',
    stable: true,
  });
  collect(): string[] {
    this.requireSupported();
    return [...new Set([navigator.language, ...navigator.languages].filter(Boolean))];
  }
}
export class TimezoneCollector extends BaseCollector<string> {
  readonly name = 'timezone';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'browser',
    stable: true,
  });
  collect(): string {
    this.requireSupported();
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}
export class ScreenCollector extends BaseCollector<ScreenData> {
  readonly name = 'screen';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'hardware',
    stable: true,
  });
  collect(): ScreenData {
    this.requireSupported();
    return {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  }
}
export class PluginsCollector extends BaseCollector<
  Array<{ name: string; description: string; filename: string }>
> {
  readonly name = 'plugins';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'browser',
    stable: false,
  });
  isSupported(): boolean {
    return super.isSupported() && navigator.plugins !== undefined;
  }
  collect(): Array<{ name: string; description: string; filename: string }> {
    this.requireSupported();
    return Array.from(navigator.plugins, (plugin) => ({
      name: plugin.name,
      description: plugin.description,
      filename: plugin.filename,
    }));
  }
}
