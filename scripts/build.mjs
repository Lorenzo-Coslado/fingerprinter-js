import { rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { rollup } from 'rollup';
import { generateVersion } from './version.mjs';

await generateVersion();
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
await rm(new URL('../.cache/types/', import.meta.url), { recursive: true, force: true });
execFileSync(
  process.execPath,
  ['node_modules/@typescript/native/bin/tsc', '--emitDeclarationOnly', '--outDir', '.cache/types'],
  { stdio: 'inherit' },
);
const { default: configs } = await import('../rollup.config.mjs');
for (const { output, ...input } of configs) {
  const bundle = await rollup(input);
  try {
    for (const options of Array.isArray(output) ? output : [output]) await bundle.write(options);
  } finally {
    await bundle.close();
  }
}
console.log('Built ESM, CommonJS, UMD and declarations for all public entries.');
