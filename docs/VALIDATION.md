# v3 validation evidence

Observed locally on **9 November 2026**, macOS ARM, Node **26.13.0**, npm **11.20.0**. These results describe this source change and the tested contexts; they are not a population accuracy study.

| Check                     | Observed result                                                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`           | Pass: formatting, ESLint, library/test/example types, unit tests, build and packed-package checks                                                                                |
| Unit and regression tests | **99 passed**, five suites                                                                                                                                                       |
| Unit source coverage      | **83.18% lines**, **79.16% branches**, **82.69% functions**; browser execution is not counted in these percentages                                                               |
| Constant-hash mutation    | **64** targeted baseline tests pass; replacing `sha256()` with a valid-shaped 64-zero constant causes **15 assertion failures** across utilities and identity contracts          |
| Packed consumer checks    | ESM named/default, CommonJS, UMD global, collector/utility subpaths, SSR-safe import and real TypeScript `nodenext`/`bundler` consumers pass                                     |
| Package structure         | publint: all good; Are the Types Wrong: no problems in the checked resolution modes                                                                                              |
| Browser suite             | **39 passed**, zero skipped, unexpected or flaky cases; Chromium, Firefox and WebKit                                                                                             |
| Interactive self-tests    | Eight real checks per browser: SHA-256, canonical order, context, explicit identification data, empty selection, timeout, storage preservation and immediate repeatability       |
| Dependency audit          | `npm audit`: **0 known vulnerabilities** in the final lockfile on this date                                                                                                      |
| Workflow syntax           | actionlint **1.7.12** passes; shellcheck integration was unavailable and disabled for this local invocation                                                                      |
| UI review                 | Desktop and 375–390px mobile layouts, light/dark, keyboard tabs, reduced motion, expanded observations, explicit collection, cancellation, safe export and load failure reviewed |
| Repository hygiene        | `git diff --check` passes; generated SDK, browser captures and reports remain ignored                                                                                            |

## What the browser cases establish

The suite serves `docs/` using a fresh copy of the current local SDK build. It verifies real SHA-256 against independent Node digests, canonical identification inputs, preserved UUIDs/context, repeatability within a short run, finite empty results, storage preservation, bounded pending collectors, lack of third-party HTTP requests in the default page/collection, interactive controls, an allow-listed diagnostic export, keyboard navigation, mobile layout, cancellation and safe rendering of markup-shaped observations.

Cancellation uses a deliberately pending Permissions API fixture, and HTML rendering uses a controlled user-agent string. These are labeled test inputs, not claims about a real malicious browser. WebRTC policy is also covered by unit tests: ordinary HTTP request observation alone cannot detect STUN/UDP traffic.

The tested browser builds are Playwright Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2. WebKit is not identical to every deployed Safari/iOS release. The unit suite also exercises resource cleanup and deterministic schema fixtures without relying on platform rendering.

## Repeat the checks

```sh
npm ci
npm run check
npm run test:coverage
npm run test:mutation
npm run build:demo
npx playwright install chromium firefox webkit
npm run test:browser
npm audit
```

The mutation script copies source/configuration into a temporary directory, runs a clean baseline and modifies only that copy. It rejects a false success caused only by a load error: assertions must fail in both hash utilities and the fingerprint engine. The main checkout is never mutated.

PR CI runs the core check on Node 22, 24 and 26, and a separate Linux browser job. The GitHub check results attached to the PR establish those remote outcomes; the local Node 26 result does not substitute for them. GitHub Pages and npm OIDC account settings remain separate from source tests; see [release setup](RELEASING.md).

## Remaining evidence boundaries

Long-term stability, population collisions, calibrated bot/fraud detection, older-browser guarantees, real mobile hardware and each deployment's privacy obligations are not established by these tests. The API and README avoid claiming those properties. A local browser signature and heuristic indicators do not reproduce the trust model of a hosted identification service.
