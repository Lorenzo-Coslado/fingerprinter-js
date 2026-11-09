import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(path.join(os.tmpdir(), 'fingerprinter-package-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (bin, args, cwd = root) =>
  execFileSync(bin, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
try {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const [archive] = JSON.parse(
    run(npm, [
      'pack',
      '--ignore-scripts',
      '--json',
      '--pack-destination',
      temporary,
      '--cache',
      path.join(os.tmpdir(), 'fingerprinter-package-cache'),
    ]),
  );
  for (const file of archive.files) {
    assert(!file.path.startsWith('src/'), `Unexpected source: ${file.path}`);
    assert(!file.path.includes('__tests__'), `Unexpected test: ${file.path}`);
  }
  await writeFile(
    path.join(temporary, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  run(
    npm,
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--offline',
      '--package-lock=false',
      '--cache',
      path.join(os.tmpdir(), 'fingerprinter-package-cache'),
      path.join(temporary, archive.filename),
    ],
    temporary,
  );
  const esm = `
import assert from 'node:assert/strict';
import Fingerprint, { Fingerprint as Named, VERSION } from 'fingerprinter-js';
import { CanvasCollector } from 'fingerprinter-js/collectors';
import { sha256 } from 'fingerprinter-js/utils';
assert.equal(Fingerprint, Named);
assert.equal(VERSION, ${JSON.stringify(pkg.version)});
assert.equal(new CanvasCollector().name, 'canvas');
assert.equal(await sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
await assert.rejects(Fingerprint.generate(), { code: 'NOT_BROWSER' });
`;
  await writeFile(path.join(temporary, 'esm.mjs'), esm);
  run(process.execPath, ['esm.mjs'], temporary);
  run(
    process.execPath,
    [
      '-e',
      `const assert = require('node:assert/strict'); const { Fingerprint, VERSION } = require('fingerprinter-js'); const { CanvasCollector } = require('fingerprinter-js/collectors'); const { simpleHash } = require('fingerprinter-js/utils'); assert.equal(typeof Fingerprint, 'function'); assert.equal(VERSION, ${JSON.stringify(pkg.version)}); assert.equal(new CanvasCollector().name, 'canvas'); assert.equal(typeof simpleHash('abc'), 'number');`,
    ],
    temporary,
  );
  const typed = `import Fingerprint, { Fingerprint as Named, type FingerprintOptions } from 'fingerprinter-js';\nimport { CanvasCollector } from 'fingerprinter-js/collectors';\nimport { sha256 } from 'fingerprinter-js/utils';\nconst options: FingerprintOptions = { profile: 'minimal', collectors: [] };\nconst a = new Fingerprint(options);\nconst b = new Named();\nvoid [a, b, new CanvasCollector(), sha256('abc')];\n`;
  await writeFile(path.join(temporary, 'consumer.mts'), typed);
  await writeFile(
    path.join(temporary, 'consumer.cts'),
    typed.replace(
      'import Fingerprint, { Fingerprint as Named, type FingerprintOptions }',
      'import { Fingerprint, Fingerprint as Named, type FingerprintOptions }',
    ),
  );
  for (const compiler of [
    'node_modules/@typescript/native/bin/tsc',
    'node_modules/typescript/bin/tsc6',
  ]) {
    for (const mode of ['nodenext', 'bundler']) {
      run(
        process.execPath,
        [
          path.join(root, compiler),
          '--noEmit',
          '--strict',
          '--target',
          'ES2020',
          '--lib',
          'ES2020,DOM,DOM.Iterable',
          '--module',
          mode === 'nodenext' ? 'NodeNext' : 'ESNext',
          '--moduleResolution',
          mode,
          ...(mode === 'nodenext' ? ['consumer.mts', 'consumer.cts'] : ['consumer.mts']),
        ],
        temporary,
      );
    }
  }
  const context = {};
  vm.runInNewContext(await readFile(path.join(root, 'dist/index.umd.cjs'), 'utf8'), context);
  assert.equal(context.FingerprinterJS.VERSION, pkg.version);
  assert.equal(typeof context.FingerprinterJS.Fingerprint, 'function');
  console.log(
    `Package verified: ${archive.filename}; ESM, CJS, UMD, subpaths, SSR imports and TypeScript 7/6 consumers.`,
  );
} catch (error) {
  if (error.stdout) process.stderr.write(String(error.stdout));
  if (error.stderr) process.stderr.write(String(error.stderr));
  throw error;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
