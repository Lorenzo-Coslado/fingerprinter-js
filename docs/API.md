# API reference

This reference describes the v3 source checkout. See [migration](MIGRATION.md) before comparing it with v2 results.

## Generate an environment signature

```ts
import Fingerprint, { createFingerprinter } from 'fingerprinter-js';

const result = await Fingerprint.generate({ profile: 'balanced' });
const agent = createFingerprinter({ profile: 'minimal', timeBudget: 500 });
const controller = new AbortController();
const next = await agent.generate({ signal: controller.signal });
```

`new Fingerprint(options)`, `Fingerprint.generate(options)` and `createFingerprinter(options)` use the same collector engine. Importing the library is safe without a DOM. Calling collection without a browser rejects with `FingerprintError` and code `NOT_BROWSER`.

## Options

| Option                   | Default              | Meaning                                                                      |
| ------------------------ | -------------------- | ---------------------------------------------------------------------------- |
| `profile`                | `'balanced'`         | `'minimal'`, `'balanced'` or `'diagnostic'`; controls the selected built-ins |
| `collectors`             | Profile selection    | Exact built-in list; `[]` disables every built-in                            |
| `customCollectors`       | `[]`                 | Additional collectors with unique, non-reserved names                        |
| `timeout`                | `5000`               | Maximum duration of an individual collection, in ms                          |
| `timeBudget`             | `1000`               | Shared total collection budget, in ms, including sequential execution        |
| `parallel`               | `true`               | Run selected collectors concurrently, or in registry order when false        |
| `signal`                 | None                 | Cancel the current collection with an `AbortSignal`                          |
| `includeSuspectAnalysis` | `false`              | Collect explicit automation observations and analyze the snapshot            |
| `includeComponents`      | `true`               | When false, omit raw `components` and successful `collectorResults.value`    |
| `customData`             | None                 | JSON application context, returned intact and never hashed                   |
| `fingerprintData`        | None                 | JSON input explicitly added to the hash; UUIDs are preserved                 |
| `namespace`              | `'fingerprinter-js'` | Public domain separation for the hash; not a secret or anonymity mechanism   |
| `network`                | `'disabled'`         | WebRTC is blocked unless explicitly selected and network is `'enabled'`      |
| `iceServers`             | `[]`                 | Optional caller-supplied STUN/TURN servers for the WebRTC collector          |

The existing `excludeUserAgent`, `excludeLanguage`, `excludeTimezone`, `excludeScreenResolution`, `excludePlugins`, `excludeCanvas`, `excludeWebGL`, `excludeAudio`, `excludeFonts`, `excludeHardware`, `excludeWebRTC`, `excludeClientHints`, `excludeStorage`, `excludeBattery`, `excludeConnection`, `excludeTouch`, `excludePermissions`, `excludeMath` and `excludeMediaDevices` flags remain available. An exclusion takes precedence over profile or explicit selection.

Instance `generate()` and `getComponents()` also accept a per-call `signal` and `includeComponents`. They use the configured selection and shared lifecycle. Cancellation returns partial results from `generate()`, with unfinished selected collectors marked `aborted`; it does not pretend they succeeded. A collection deadline yields `timeout`. Invalid configuration or serialization can reject with `INVALID_INPUT`.

Budgets apply to collection. JavaScript cannot forcibly interrupt synchronous code, and a custom collector may ignore its signal; register cleanup callbacks for resources it creates. Serialization and final hashing happen after collection and are not a hard real-time operation.

## Profiles and schema 3

`Fingerprint.getCollectorMetadata()` or the exported `getCollectorMetadata()` returns descriptors with name, category, profile membership, network effect and whether a stable projection exists. This registry is the source of profile selection.

| Profile      | Selected collectors                                                    |
| ------------ | ---------------------------------------------------------------------- |
| `minimal`    | Language, timezone, hardware, touch and math                           |
| `balanced`   | Minimal plus user agent, screen, canvas, WebGL, fonts and Client Hints |
| `diagnostic` | All built-ins except WebRTC                                            |

The diagnostic profile can read additional sensitive configuration and may take longer. It is not an accuracy upgrade. `network: 'enabled'` alone does not add WebRTC to a profile. To collect ICE observations, explicitly select `webrtc` as well.

| Observation                                                                                              | Fields entering fingerprint schema 3                                                                 |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Language                                                                                                 | Preferred language list, preserving preference order                                                 |
| Timezone                                                                                                 | IANA timezone name                                                                                   |
| Screen                                                                                                   | Color depth and pixel depth; no resolution, available size or device pixel ratio                     |
| Canvas                                                                                                   | Fixed render output                                                                                  |
| WebGL                                                                                                    | Vendor, renderer, unmasked vendor/renderer where exposed, max texture size and max vertex attributes |
| Fonts                                                                                                    | Sorted detected system-font set                                                                      |
| Hardware                                                                                                 | Logical core count, exposed memory, platform and max touch points; no `oscpu`                        |
| Client Hints                                                                                             | Platform and mobile flag; no brand list, version, model or high-entropy detail                       |
| Touch                                                                                                    | Max touch points only                                                                                |
| Math                                                                                                     | Fixed math results                                                                                   |
| User agent, plugins, audio, storage, battery, connection, permissions, media devices, WebRTC, automation | Not included                                                                                         |

Schema 3 hashes the canonical representation of `{ schema, namespace, components, data? }`; `components` contains only successful stable projections, and `data` is present when `fingerprintData` is supplied. Unsupported and failed collectors do not contribute error strings or placeholder values. Differences in selected projections or their availability can therefore change the fingerprint. A stable projection is an explicit policy, not a promise that the underlying environment never changes.

## Result

```ts
interface FingerprintResult {
  fingerprint: string; // 64 lowercase hexadecimal SHA-256 characters
  fingerprintVersion: '3'; // identification schema, separate from npm version
  hashComponents: string[]; // successful projections included in this hash
  quality: 'complete' | 'partial' | 'empty';
  collectionCoverage: number; // successful / selected collections, 0–100
  components: Components; // available observations, unless omitted
  collectorResults: CollectorResults;
  duration: number; // observed total duration in ms
  version: string; // library version
  suspectAnalysis?: SuspectAnalysis;
  confidence: number; // deprecated alias of collectionCoverage
  entropy: null; // deprecated; not statistically measured
}
```

`quality: 'empty'` means no browser projection or nonempty explicit identification data was available. It still has a deterministic SHA-256, which must not be interpreted as a usable unique identifier. `complete` means the selected collectors succeeded and identification input was available; `partial` means some selected observations were unavailable. None of these fields estimates identity accuracy.

The `collectorResults` map includes excluded built-ins. A successful entry has `status: 'ok'`, `duration` and, when enabled, `value`. All other states have `duration` and a human-readable `reason`:

| Status        | Meaning                                                  |
| ------------- | -------------------------------------------------------- |
| `unsupported` | API or observation not available in this environment     |
| `blocked`     | Access denied by browser policy or network configuration |
| `timeout`     | Per-collector or total collection deadline reached       |
| `error`       | Other collector/normalization failure                    |
| `excluded`    | Not selected or explicitly excluded                      |
| `aborted`     | Interrupted by the caller                                |

Collection coverage is zero for an empty selection. Successful diagnostic collectors contribute to coverage even though they do not enter the fingerprint. Automation analysis availability is reported separately through `suspectAnalysis.status`.

## Extend collection

```ts
import { Fingerprint, type ComponentCollector } from 'fingerprinter-js';

const capabilities: ComponentCollector<{ capability: string; transient: number }> = {
  name: 'appCapabilities',
  metadata: { name: 'appCapabilities', category: 'browser', stable: true },
  isSupported: () => true,
  collect(context) {
    context?.onCleanup(() => {
      /* release resources created by this call */
    });
    return { capability: 'v1', transient: Date.now() };
  },
  project: (value) => ({ capability: value.capability }),
};

const result = await Fingerprint.generate({ customCollectors: [capabilities] });
```

Custom collectors contribute to the hash only through an explicit `project()`. Their projection is part of the application's identification contract. A `metadata.stable` flag alone does not put arbitrary data into the hash. Collector names must be unique, safe and not collide with built-ins or reserved component names. Any custom collector with a network effect must declare `metadata.network: true` and honor the configured policy.

The classes in `fingerprinter-js/collectors` can also be used directly. Direct use bypasses profile selection, the central budget and network gating; provide and honor a lifecycle context when needed, and explicitly review the effects of a network collector. Use `Fingerprint.generate()` for managed orchestration.

## Compare and inspect

```ts
import { compareFingerprints, SuspectAnalyzer } from 'fingerprinter-js';

const diff = compareFingerprints(previous, current);
// sameFingerprint, sameVersion and added/removed/changed raw component values
const replay = SuspectAnalyzer.analyze(current.components);
```

Comparison describes available raw observations. Some can change without affecting the stable projection. `fingerprintData`, namespace changes and omitted raw values cannot be reconstructed from the component diff alone; preserve your integration configuration separately. Do not compare incompatible fingerprint versions as if a hash difference implied a changed visitor.

The analyzer is pure and versioned. Its heuristic `score` and `riskLevel` describe explicit automation/declarative crawler indicators, not malicious intent or a calibrated probability. `status` describes whether its user agent and automation inputs were supplied. See [ecosystem decisions](ECOSYSTEM.md) and [security](../SECURITY.md).

## Utility entry

`fingerprinter-js/utils` exports canonical serialization, SHA-256 and comparison helpers. `canonicalStringify` / `safeStringify` sort object keys recursively, preserve array order, allow shared non-cyclic references and reject unsupported/circular JSON data. `sha256` always uses genuine SHA-256; its fallback matches the same algorithm when Web Crypto is unavailable. `simpleHash` remains a legacy non-cryptographic helper and is never used to generate a fingerprint.
