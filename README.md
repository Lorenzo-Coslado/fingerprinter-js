<img src="docs/assets/favicon.svg" alt="FingerprinterJS logo" width="80" height="80" />

# FingerprinterJS — Browser fingerprinting

[![npm version](https://img.shields.io/npm/v/fingerprinter-js)](https://www.npmjs.com/package/fingerprinter-js)
[![npm downloads per month](https://img.shields.io/npm/dm/fingerprinter-js)](https://www.npmjs.com/package/fingerprinter-js)
[![npm total downloads](https://img.shields.io/npm/dt/fingerprinter-js)](https://www.npmjs.com/package/fingerprinter-js)
[![CI](https://github.com/Lorenzo-Coslado/fingerprinter-js/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Lorenzo-Coslado/fingerprinter-js/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Lorenzo-Coslado/fingerprinter-js/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/Lorenzo-Coslado/fingerprinter-js/actions/workflows/codeql.yml)
[![MIT license](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**An open-source browser fingerprinting library for JavaScript and TypeScript.** Generate local SHA-256 fingerprints from browser signals, inspect typed collector results, and compare browser observations in your application.

[Live browser fingerprint test](https://lorenzo-coslado.github.io/fingerprinter-js/) · [npm package](https://www.npmjs.com/package/fingerprinter-js) · [API reference](docs/API.md) · [Report a bug](https://github.com/Lorenzo-Coslado/fingerprinter-js/issues/new/choose)

> **Release channels:** this README documents **v3.0.0 in the repository**, and the live playground runs that source. The npm version badge shows the published release. While npm still serves v2, use the [v2 documentation](https://github.com/Lorenzo-Coslado/fingerprinter-js/blob/a9ba5f02ce6fad4139a32130fa367b0781493b6a/README.md) for that package, or [build this checkout](#try-it-and-run-the-tests) to try v3. Fingerprints change between these major versions; see [migration from v2](docs/MIGRATION.md).

## Why FingerprinterJS?

- **19 browser collectors** covering canvas, WebGL, system fonts, hardware, Client Hints and optional diagnostic APIs.
- **Versioned fingerprints** built from explicit stable fields, canonical JSON and genuine SHA-256, including the fallback.
- **Typed diagnostics** for successful, unsupported, blocked, timed-out, excluded and cancelled collectors.
- **Local collection** with no runtime dependencies, required account, telemetry or network requests by default.
- **Integration controls** for profiles, exact collector selection, deadlines, cancellation and reduced output.
- **Modern package formats** with ESM, CommonJS, a browser UMD bundle, public TypeScript declarations and safe SSR imports.
- **MIT license and reproducible checks** with unit tests, mutation checks and Chromium, Firefox and WebKit coverage.

Use it for browser compatibility diagnostics, environment correlation in your own application, investigating changed browser signals, or collecting explainable inputs for an application-side risk assessment. The [interactive playground](https://lorenzo-coslado.github.io/fingerprinter-js/) lets you try it without an account.

## Contents

- [Installation and quick start](#installation-and-quick-start)
- [How browser fingerprinting works](#how-browser-fingerprinting-works)
- [Collection profiles and configuration](#collection-profiles-and-configuration)
- [Timeouts, cancellation and partial results](#timeouts-cancellation-and-partial-results)
- [Application context and fingerprint data](#application-context-and-fingerprint-data)
- [Comparing fingerprints and automation indicators](#comparing-fingerprints-and-automation-indicators)
- [Browser support and SSR](#browser-support-and-ssr)
- [Frequently asked questions](#frequently-asked-questions)
- [Documentation and support](#documentation-and-support)
- [Try it and run the tests](#try-it-and-run-the-tests)
- [Contributing](#contributing)
- [License](#license)

## Installation and quick start

Install the published package with npm:

```sh
npm install fingerprinter-js
```

For pnpm, Yarn or Bun, use `pnpm add fingerprinter-js`, `yarn add fingerprinter-js` or `bun add fingerprinter-js`.

The following example uses the **v3 API**:

```ts
import { Fingerprint } from 'fingerprinter-js';

// Call from a browser event or lifecycle, when collection is authorized.
const result = await Fingerprint.generate();

console.log(result.fingerprint); // SHA-256 browser environment signature
console.log(result.fingerprintVersion); // '3' — the identification schema
console.log(result.collectionCoverage); // successful / selected collectors, 0–100
console.log(result.collectorResults); // states, durations and observations
```

Importing the package is safe during server rendering. **Collect in the browser.** A signature can change when the environment, selected collectors or available observations change. Different environments can share it. It does not authenticate a device or establish that a visitor is human.

## How browser fingerprinting works

Browser fingerprinting derives a signature from observable browser configuration and rendering behavior. FingerprinterJS separates the raw observations from the fields used for identification, so the input to each fingerprint can be inspected.

![Selected observations pass through a versioned stable projection and canonical SHA-256 hashing, then return a signature with diagnostics.](docs/assets/pipeline.svg)

Only successful, explicitly selected identification fields enter the hash. Resolution, zoom, browser version strings, storage quota, battery, connection, permission states and device counts stay outside it. The [complete projection table](docs/API.md#profiles-and-schema-3) describes schema 3.

The package version and fingerprint schema are separate. Store `fingerprintVersion` with the hash, and read the [migration guide](docs/MIGRATION.md) before upgrading.

## Collection profiles and configuration

| Profile              | Purpose                                  | Selection                                                           |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| `minimal`            | Small configuration signature            | Language, timezone, hardware, touch, math                           |
| `balanced` — default | Rendering and configuration observations | Minimal plus user agent, screen, canvas, WebGL, fonts, Client Hints |
| `diagnostic`         | Inspect optional browser capabilities    | All built-ins except WebRTC                                         |

More observations do not imply a measured accuracy improvement. Choose a profile for its purpose, cost and data effects. Use an exact list when you need tighter control:

```ts
const result = await Fingerprint.generate({
  collectors: ['language', 'timezone', 'canvas'],
  timeout: 500, // each collector
  timeBudget: 800, // shared collection budget
  includeComponents: false,
});
```

`includeComponents: false` omits raw observations from both result locations, while retaining statuses and timing. It reduces the returned data, not the collection itself. Default profiles make no network requests. WebRTC requires explicit selection and `network: 'enabled'`; no public STUN server is hardcoded.

## Timeouts, cancellation and partial results

```ts
const controller = new AbortController();
const agent = new Fingerprint({ profile: 'balanced', timeBudget: 1_000 });
const result = await agent.generate({ signal: controller.signal });

for (const [name, collection] of Object.entries(result.collectorResults)) {
  if (collection.status !== 'ok' && collection.status !== 'excluded') {
    console.log(name, collection.status, collection.reason);
  }
}
```

States distinguish `ok`, `unsupported`, `blocked`, `timeout`, `error`, `excluded` and `aborted`. Cancellation returns partial results and releases registered resources. Empty selections have zero coverage and `quality: 'empty'`; their deterministic hash is not a usable unique identifier.

**Coverage is availability, not identity accuracy.** `confidence` remains a deprecated alias for coverage. `entropy` is `null`: this library does not estimate population entropy or publish an unmeasured precision percentage.

## Application context and fingerprint data

```ts
const result = await Fingerprint.generate({
  customData: { requestId: 'request-123', timestamp: Date.now() },
});
// Context is preserved in components.custom and does not affect the hash.
```

If application data must explicitly contribute, use `fingerprintData` and optionally a public `namespace`. UUIDs are preserved, object keys are sorted recursively and array order is retained. Unsupported JSON data is rejected explicitly. See [API contracts](docs/API.md).

## Comparing fingerprints and automation indicators

```ts
import { compareFingerprints, SuspectAnalyzer } from 'fingerprinter-js';

const comparison = compareFingerprints(previous, current);
console.log(comparison.sameVersion, comparison.changes);

const result = await Fingerprint.generate({ includeSuspectAnalysis: true });
const replay = SuspectAnalyzer.analyze(result.components);
```

Comparison shows changes in available observations; not every observation enters the hash. The analysis replays a versioned snapshot of explicit automation and declared crawler indicators. Its score is a heuristic weight, **not a fraud probability**. Missing APIs, privacy defenses, international language choices and successful collection are not bot evidence.

Browser data can be forged or omitted. Use these observations alongside trusted application signals, never as authentication or the sole basis for blocking a person. Read the [security policy](SECURITY.md) and [ecosystem decisions](docs/ECOSYSTEM.md).

## Browser support and SSR

The browser target is ES2020 with feature detection and explicit degradation. Automated browser tests cover current Chromium, Firefox and WebKit. WebKit testing is not a certification of every Safari/iOS release; validate real mobile hardware and older browser versions in the target integration.

The package can be imported by a server-rendered application without accessing the DOM at import time. Run `generate()` in a browser event or client lifecycle. Collection in Node.js rejects with `NOT_BROWSER`.

```js
// CommonJS consumers use the named export.
const { Fingerprint } = require('fingerprinter-js');
```

```ts
// Individual collectors and utilities are public package entries.
import { CanvasCollector } from 'fingerprinter-js/collectors';
import { canonicalStringify } from 'fingerprinter-js/utils';
```

For a plain script tag, the browser bundle is `dist/index.umd.cjs` and its global is `FingerprinterJS`. See [imports and execution](docs/MIGRATION.md#imports-and-browser-execution) and the [full API reference](docs/API.md).

## Frequently asked questions

### Is a browser fingerprint a unique device or user ID?

No. It is a signature of the selected observations available in a browser context. Different environments can share it, and browser, hardware, policy or configuration changes can change it. Keep the fingerprint schema with stored values and use trusted application context when correlating results.

### Does it detect bots or prevent fraud?

It can report explicit automation and declared crawler indicators when analysis is enabled. These are heuristic inputs, not a calibrated bot probability or a fraud verdict. A client can modify, omit or replay its observations. Hosted identification services have a different trust model; the [ecosystem comparison](docs/ECOSYSTEM.md) explains the scope.

### Does it use cookies, store an identifier or send telemetry?

The v3 SDK does not persist a visitor identifier, set an identification cookie or transmit telemetry. The storage collector uses temporary probes, and optional collectors have documented effects. WebRTC requires explicit selection and network opt-in. Read the [data collection inventory](docs/PRIVACY.md) before choosing a profile.

### Is browser fingerprinting automatically GDPR compliant or exempt from consent?

No. Requirements depend on purpose, necessity and deployment. Hashing observations does not make them anonymous. The [privacy guide](docs/PRIVACY.md) explains integration responsibilities and links to primary guidance.

### How can I test whether fingerprints change in my browser?

Use the [live browser fingerprint test](https://lorenzo-coslado.github.io/fingerprinter-js/), compare consecutive runs and inspect component changes. Its eight self-tests verify implementation behavior in the current browser; they do not measure population uniqueness or long-term identification accuracy.

## Documentation and support

| Resource                                                             | What it covers                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [API reference](docs/API.md)                                         | Options, result types, collector projections and custom collectors |
| [Migration guide](docs/MIGRATION.md)                                 | Breaking changes, fingerprint compatibility and v2 → v3 upgrades   |
| [Privacy and collection effects](docs/PRIVACY.md)                    | Observations, temporary storage, network opt-in and minimization   |
| [Playground guide](docs/DEMO.md)                                     | Interactive controls, browser self-tests and diagnostic export     |
| [Changelog](CHANGELOG.md)                                            | Changes by package version                                         |
| [Validation evidence](docs/VALIDATION.md)                            | Tested software contracts and remaining evidence boundaries        |
| [Security policy](SECURITY.md)                                       | Private vulnerability reporting and supported scope                |
| [Issues](https://github.com/Lorenzo-Coslado/fingerprinter-js/issues) | Reproducible bugs and feature requests                             |

For a bug report, include package version, browser/OS, profile, collector statuses and a minimal reproduction. Keep raw visitor observations and security reports out of public issues.

## Try it and run the tests

```sh
git clone https://github.com/Lorenzo-Coslado/fingerprinter-js.git
cd fingerprinter-js
npm ci
npm run demo
```

Open `http://127.0.0.1:4173`. The demo uses the current local SDK, starts collection only when requested and includes profile controls, component inspection, repeatability checks, safe diagnostic export and in-browser self-tests.

```sh
npm run check              # lint, types, unit tests, build and packed consumers
npm run test:coverage
npm run test:mutation      # prove that a constant hash makes regression tests fail
npx playwright install chromium firefox webkit
npm run build:demo
npm run test:browser       # SDK + demo, three browser engines
```

To install this checkout in another application, run `npm run build && npm pack --ignore-scripts`, then install the generated `.tgz`. Every public entry is checked from that archive through ESM, CommonJS and TypeScript consumer projects. CI runs on pull requests; the Pages workflow builds the demo with the same source SDK. [Release setup](docs/RELEASING.md) documents the required npm/GitHub settings.

Development tools require Node 22.22.2+, 24.15+ or 26+. The SDK's browser runtime has no npm dependencies. Network collectors, optional high-entropy APIs and raw diagnostics deserve separate review for each deployment.

## Contributing

Contributions, documentation improvements and reproducible bug reports are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), use [GitHub issues](https://github.com/Lorenzo-Coslado/fingerprinter-js/issues) for ordinary bugs and follow the [code of conduct](CODE_OF_CONDUCT.md). Security reports use the private channel in [SECURITY.md](SECURITY.md).

Maintained by [Lorenzo Coslado](https://github.com/Lorenzo-Coslado). [Sponsor the project](https://github.com/sponsors/Lorenzo-Coslado) to support maintenance. Support is provided on a best-effort basis.

## License

[MIT](LICENSE) © Lorenzo Coslado. Contributions and reproducible bug reports are welcome through the [contribution guide](CONTRIBUTING.md).
