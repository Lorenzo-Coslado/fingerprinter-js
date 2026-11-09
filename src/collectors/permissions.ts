import { FingerprintError } from '../types';
import type { CollectorContext, PermissionsData } from '../types';
import { AsyncBaseCollector, BaseCollector } from './base';

export class PermissionsCollector extends AsyncBaseCollector<PermissionsData> {
  readonly name = 'permissions';
  readonly metadata = BaseCollector.createMetadata(this.name, {
    category: 'permissions',
    stable: false,
  });
  isSupported(): boolean {
    return super.isSupported() && typeof navigator.permissions?.query === 'function';
  }
  async collect(context?: CollectorContext): Promise<PermissionsData> {
    this.requireSupported(context);
    const result: PermissionsData = {};
    await this.withTimeout(
      Promise.all(
        (['notifications', 'geolocation', 'camera', 'microphone'] as const).map(async (name) => {
          try {
            result[name] = (
              await navigator.permissions.query({ name: name as PermissionName })
            ).state;
          } catch {
            /* Per-permission support differs; a failure is not a denied permission. */
          }
        }),
      ),
      undefined,
      context?.signal,
    );
    if (!Object.keys(result).length)
      throw new FingerprintError('No queried permission is available', 'UNSUPPORTED', this.name);
    return result;
  }
}
