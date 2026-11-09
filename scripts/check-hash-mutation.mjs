/** Prove that real input-sensitive assertions reject a valid-shape constant hash. */
import { cp, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await realpath(
  await mkdtemp(path.join(tmpdir(), 'fingerprinter-hash-mutation-')),
);
const suites = [
  'src/__tests__/utils.test.ts',
  'src/__tests__/fingerprint.test.ts',
  'src/__tests__/stability.test.ts',
];

async function runSuite(name) {
  const outputFile = path.join(temporary, `${name}.json`);
  const run = spawnSync(
    process.execPath,
    [
      path.join(root, 'node_modules/vitest/vitest.mjs'),
      'run',
      ...suites,
      '--root',
      temporary,
      '--config',
      path.join(temporary, 'vitest.config.ts'),
      '--reporter=json',
      `--outputFile=${outputFile}`,
    ],
    { cwd: temporary, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 },
  );
  if (run.error) throw run.error;
  let result;
  try {
    result = JSON.parse(await readFile(outputFile, 'utf8'));
  } catch {
    throw new Error(
      `${name} did not produce test results:\n${(run.stderr + run.stdout).slice(-6000)}`,
    );
  }
  return { exitCode: run.status, result, output: run.stderr + run.stdout };
}

function summary(run) {
  const failedAssertions = run.result.testResults.flatMap((file) =>
    file.assertionResults
      .filter((assertion) => assertion.status === 'failed')
      .map((assertion) => ({
        file: path.relative(temporary, file.name).replaceAll(path.sep, '/'),
        test: assertion.fullName,
      })),
  );
  return {
    exitCode: run.exitCode,
    passedTests: run.result.numPassedTests,
    failedTests: run.result.numFailedTests,
    failedAssertions,
  };
}

try {
  await cp(path.join(root, 'src'), path.join(temporary, 'src'), { recursive: true });
  await cp(path.join(root, 'tests'), path.join(temporary, 'tests'), { recursive: true });
  for (const name of await readdir(root)) {
    if (
      name === 'package.json' ||
      name === 'vitest.config.ts' ||
      (name.startsWith('tsconfig') && name.endsWith('.json'))
    ) {
      await cp(path.join(root, name), path.join(temporary, name));
    }
  }
  await symlink(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');

  const baseline = await runSuite('baseline');
  if (baseline.exitCode !== 0 || baseline.result.numFailedTests !== 0) {
    throw new Error(
      `Baseline must pass before mutation:\n${JSON.stringify(summary(baseline), null, 2)}\n${baseline.output.slice(-6000)}`,
    );
  }

  const target = path.join(temporary, 'src/utils.ts');
  const source = await readFile(target, 'utf8');
  const ast = ts.createSourceFile(target, source, ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(
    (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === 'sha256',
  );
  if (!declaration?.body) throw new Error('Cannot locate the sha256 function body to mutate.');
  const mutated =
    source.slice(0, declaration.body.getStart(ast)) +
    '{ return "0".repeat(64); }' +
    source.slice(declaration.body.end);
  await writeFile(target, mutated);
  const mutant = await runSuite('mutant');
  const result = { baseline: summary(baseline), mutant: summary(mutant) };
  const failedFiles = new Set(result.mutant.failedAssertions.map((assertion) => assertion.file));
  const utilsRejected = failedFiles.has('src/__tests__/utils.test.ts');
  const engineRejected =
    failedFiles.has('src/__tests__/fingerprint.test.ts') ||
    failedFiles.has('src/__tests__/stability.test.ts');
  const killed =
    mutant.exitCode !== 0 && result.mutant.failedTests > 0 && utilsRejected && engineRejected;
  console.log(
    JSON.stringify(
      {
        mutation: 'sha256 returns the same 64-zero string for every input',
        killed,
        ...result,
      },
      null,
      2,
    ),
  );
  if (!killed) {
    throw new Error(
      'The constant hash must cause assertion failures in both utilities and the fingerprint engine.',
    );
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
