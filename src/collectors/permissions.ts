/**
 * Permissions Collector
 * Checks permission states for various APIs
 */

import { CollectorMetadata, PermissionsData } from "../types";
import { AsyncBaseCollector, BaseCollector } from "./base";

/**
 * Permissions Collector
 * Uses Permissions API to check permission states
 */
export class PermissionsCollector extends AsyncBaseCollector<PermissionsData> {
  readonly name = "permissions";
  readonly metadata: CollectorMetadata = BaseCollector.createMetadata(
    "permissions",
    {
      weight: 4,
      entropy: 5,
      stable: false, // Permissions can change
      category: "permissions",
    }
  );

  isSupported(): boolean {
    return (
      super.isSupported() &&
      "permissions" in navigator &&
      typeof navigator.permissions.query === "function"
    );
  }

  async collect(): Promise<PermissionsData> {
    if (!this.isSupported()) {
      return {};
    }

    const permissionNames = [
      "notifications",
      "geolocation",
      "camera",
      "microphone",
      "push",
    ] as const;

    const result: PermissionsData = {};

    await Promise.all(
      permissionNames.map(async (name) => {
        try {
          const permission = await navigator.permissions.query({
            name: name as PermissionName,
          });
          result[name] = permission.state;
        } catch {
          // Some permissions may not be queryable
        }
      })
    );

    return result;
  }
}
