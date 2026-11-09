# Migrating from v2 to v3

Version 3 changes the identification scheme and default collection policy. A v3 hash is not interchangeable with a v2 hash. Keep the old version attached to stored observations and plan the transition explicitly.

## Changed contracts

| v2                                                                                  | v3                                                                                                                  |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| All 19 collectors enabled by default, including Google STUN traffic                 | `balanced` profile by default; WebRTC requires explicit selection and network opt-in, without an imposed ICE server |
| Entire `stable` collectors hashed                                                   | A conservative, field-specific schema 3 projection                                                                  |
| `customData` silently filtered and included in the hash                             | JSON context preserved intact and kept outside the hash                                                             |
| UUID-shaped values dropped                                                          | UUIDs preserved; use `fingerprintData` explicitly when they must affect the hash                                    |
| Object insertion order affected the hash                                            | Canonical serialization sorts object keys recursively                                                               |
| Weak hash used when Web Crypto is absent                                            | Standards-compatible SHA-256 fallback                                                                               |
| `confidence` appeared to describe reliability                                       | `collectionCoverage` reports collection availability; `confidence` is only a deprecated alias                       |
| Hardcoded entropy sum                                                               | `entropy: null`; no unmeasured bit estimate                                                                         |
| Missing APIs, privacy tools, locale choices and error-free results raised suspicion | Pure, replayable analysis of explicit automation and declared crawler indicators                                    |
| Some promises could wait forever; options ignored                                   | Managed deadlines, shared collection budget, cancellation and resource cleanup                                      |
| `/collectors` pointed at a missing file                                             | Tested ESM/CommonJS entries and bundled declarations                                                                |

## Application context and identification input

```ts
// v3: request data does not change an environment signature.
const result = await Fingerprint.generate({
  customData: { requestId, timestamp: Date.now() },
});

// Only add stable application data to identification when explicitly intended.
const scoped = await Fingerprint.generate({
  namespace: 'my-application',
  fingerprintData: { stableAccountScope },
});
```

`allowUnstableData` is retained as a deprecated compatibility option with no effect. v3 does not guess whether a UUID, key name or large number is stable. Input must be JSON-serializable under the documented canonical contract; unsupported data throws an explicit `INVALID_INPUT` instead of becoming an accidental placeholder.

## Persist versions and handle partial data

Store `fingerprintVersion` with the fingerprint and retain the relevant configuration/profile in your integration. `version` identifies the package build; `fingerprintVersion` identifies the normalized source and projection policy. Availability of a projection still matters: a blocked canvas, changed hardware or a different collector selection can change a signature within a schema.

Use `quality`, `collectorResults` and `collectionCoverage` to handle unavailable data rather than treating it as fraud. An empty result still hashes its empty envelope; do not treat that value as a unique device. `getComponents()` uses the same managed collector engine but returns available observations only.

Cancellation returns partial generation results, marking unfinished collectors `aborted`. A deadline marks them `timeout`. Await the result and inspect states rather than expecting cancellation to produce a full signature or successful collection.

## Imports and browser execution

```ts
import Fingerprint, { createFingerprinter } from 'fingerprinter-js';
import { CanvasCollector } from 'fingerprinter-js/collectors';
import { canonicalStringify } from 'fingerprinter-js/utils';
```

```js
const { Fingerprint } = require('fingerprinter-js');
```

The browser UMD global is `FingerprinterJS`, in `dist/index.umd.cjs`. ESM uses `dist/index.js` and CommonJS uses `dist/index.cjs`. Importing is safe during SSR; call collection from a browser lifecycle or event. Do not replace a server session, authentication mechanism or server-side risk controls with a client hash.

## Upgrade policy

This change does not include a hidden v2 collection mode. Reproducing historical v2 data would retain its unstable inputs and implicit network effects. If an application temporarily needs both versions, keep the integrations and versions explicit, collect only when authorized, and migrate stored associations through its own trusted account/session context. Never infer v2→v3 equivalence from equal-looking hashes.

Within schema 3, golden fixtures protect canonical input/output behavior. Changes to normalization or projection that alter IDs must document a schema revision and migration impact. SemVer governs the JavaScript API separately. Environment changes and changed collector availability can always affect a fingerprint; no permanent or cross-browser user identity is promised.
