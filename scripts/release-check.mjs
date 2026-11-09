import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { VERSION } from '../dist/index.js';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(VERSION, pkg.version, 'Build version must match package.json');
assert.equal(pkg.publishConfig.registry, 'https://registry.npmjs.org/');
assert.equal(pkg.name, 'fingerprinter-js');
assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
const changelog = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
assert(changelog.includes(`## [${pkg.version}]`), 'Add a changelog entry for this version');
if (process.env.RELEASE_TAG)
  assert.equal(
    process.env.RELEASE_TAG,
    `v${pkg.version}`,
    'Release tag must match the package version',
  );
const changes = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
  encoding: 'utf8',
});
if (process.env.CI) assert.equal(changes.trim(), '', 'Release checkout must be clean');
console.log(`Release metadata verified for v${pkg.version}. No package was published.`);
