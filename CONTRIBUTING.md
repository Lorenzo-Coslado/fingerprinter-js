# Contributing

Use a supported Node.js LTS runtime: 22.22.2+, 24.15+ or 26+. The browser SDK has no runtime dependencies; these requirements describe its development tools.

```sh
npm ci
npm run check
npm run demo
```

The demo runs at `http://127.0.0.1:4173`, uses the local build and starts no collection until an explicit action. The browser console and the page's self-tests can help reproduce a bug. Do not post unredacted browser observations from real visitors in a public issue.

## Project structure

| Location                  | Purpose                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| `src/fingerprint.ts`      | Collection orchestration, projection and versioned fingerprint generation |
| `src/collectors/`         | Browser observations and their capability/cleanup contracts               |
| `src/utils.ts`            | Canonical serialization, hashing and comparisons                          |
| `src/suspect-analyzer.ts` | Pure, replayable heuristic analysis of an explicit snapshot               |
| `src/__tests__/`          | Unit and regression tests using real hash functions                       |
| `tests/browser/`          | SDK and demo tests in Chromium, Firefox and WebKit                        |
| `scripts/`                | Reproducible build, package checks and local preview                      |
| `docs/`                   | Demo, API, migration, data collection and release guides                  |

## Validation

```sh
npm test                          # deterministic unit/regression tests
npm run test:coverage             # coverage report; inspect missing contracts
npm run typecheck                # includes test code
npm run build:demo
npx playwright install chromium firefox webkit
npm run test:browser
```

`npm run check` runs the core validation chain, including formatting and installing the generated archive into isolated consumers. `npm run format` applies the repository's Prettier style. `npm run test:package` checks every public entry, CJS/ESM/UMD behavior, safe SSR imports and TypeScript module resolution. Browser tests also run in CI. Changes to browser collectors or the demo should run both chains.

## Code and API expectations

Keep TypeScript strict and types useful at the consumer boundary. Use the flat ESLint configuration and Prettier settings as the executable style standard. Prefer a small tested interface over a new abstraction with one use. Public behavior and collection effects belong in the docs.

The development graph currently overrides `minimatch` to the patched 11.x line for [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). ESLint/config-array and typescript-estree use the retained matching API; lint, type and package checks validate this combination. Reassess/remove this override when their dependency ranges include a patched version.

The default `tsc` command is the stable TypeScript 7 compiler, installed through the `@typescript/native` npm alias. It checks source, tests and examples, emits declarations, and validates packed consumers. The `typescript` dependency aliases Microsoft's `@typescript/typescript6` compatibility package: ESLint, Rollup's JavaScript transformation, declaration bundling and the mutation harness still use its compiler API. This follows [Microsoft's side-by-side migration guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0), because TypeScript 7.0 does not expose that API. Keep these roles explicit when updating either alias; `npm run test:package` checks consumers with both compilers in NodeNext and bundler modes. A clean `npm ci` must succeed without peer-dependency bypasses, and `npx --no-install tsc --version` must report the TypeScript 7 version.

For a collector change, define its supported/blocked/error outcomes, timeout and cancellation behavior, resource cleanup and exact stable projection. A collector being available is not evidence its data is stable. Do not add network effects or permanent state to default profiles.

For hashing, test known SHA-256 vectors, equivalence after canonical normalization and a positive control where changed identification data changes the result. Do not mock a digest or encoder to a constant. Preserve historical fixtures when revising the schema, and document which IDs become incompatible.

For an analysis rule, supply replayable snapshots showing both the intended indicator and legitimate nearby cases. Missing APIs, exclusion, international language choices and privacy protection are not fraud evidence. A score is not a measured probability.

For UI changes, preserve keyboard access, meaningful labels, visible focus, small-screen layout and reduced-motion behavior. Use `textContent` for observations and treat third-party/custom values as data.

## Pull requests and security

Explain the concrete problem, resulting behavior and validation. Include migration notes for public API or fingerprint changes. Small focused follow-up PRs are easier to review than unrelated maintenance mixed into a feature.

Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/Lorenzo-Coslado/fingerprinter-js/security/advisories/new). See [SECURITY.md](SECURITY.md) for the support and disclosure policy. For ordinary bugs, include package version, browser/OS, profile, collector statuses, reproduction and expected behavior. See [release instructions](docs/RELEASING.md) for maintainers.
