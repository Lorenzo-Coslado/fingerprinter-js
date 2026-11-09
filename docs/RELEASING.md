# Releasing FingerprinterJS

Release a reviewed commit whose package version, generated `src/version.ts` and changelog agree. Merging to `main` runs CI and deploys the playground; it does not publish an npm version. Publication starts when a matching GitHub release is published. Verify the npm registry after that workflow finishes.

## One-time repository setup

1. On npm, configure a trusted publisher for `fingerprinter-js`, repository `Lorenzo-Coslado/fingerprinter-js`, workflow `publish.yml`, environment `npm`.
2. In GitHub, create/configure the `npm` environment and restrict releases to reviewed version tags. Review repository write and tag permissions. The workflow requests an OIDC token only in the publishing job.
3. For the demo, select **GitHub Actions** as the Pages build source. The `pages.yml` workflow builds the current SDK into the site and tests it before deployment.

These account and repository settings are separate from source changes. No access token, registry edit or manual manifest rewrite is needed by the workflow. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Prepare and validate

```sh
npm ci
npm run check
npm run test:coverage
npm run build:demo
npx playwright install chromium firefox webkit
npm run test:browser
npm run release:check
```

`check` validates lint, library and test types, unit tests, the build, real package consumers, package structure and public type resolution. Browser tests exercise the local demo and SDK across three engines. `release:check` verifies metadata; it does not publish.

Review [fingerprint compatibility](MIGRATION.md) whenever collectors, projection, normalization or hash inputs change. Record changes affecting IDs explicitly, even when the JavaScript API is compatible. Do not attach an accuracy claim to passing software tests.

## Publish the validated archive

After validation, commit the reviewed changes, create the matching `vX.Y.Z` tag and publish a GitHub release for that tag. The workflow checks out that tag, reruns validation and browser tests, checks tag/version agreement, packs once and publishes that archive with provenance through npm OIDC. It does not increment a version, push a branch, edit npm configuration or publish to a second registry.

Inspect the workflow result, npm version and provenance after publishing. If publication fails, inspect the failed step before retrying. A version already published to npm cannot be reused; correct the source and prepare a new version when necessary. Do not change a published tag to make a failed workflow appear successful.

For an explicitly planned prerelease, add an appropriate npm distribution tag to the publication policy before creating the release; the standard workflow publishes stable releases to the default tag. Do not use the stable workflow for an unreviewed prerelease.
