// Reproductions de l'audit : npm run build, puis node <ce fichier>.
// Ce script ne modifie pas le SDK et n'utilise pas le réseau.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '../..');
const sdk = require(path.join(root, 'dist/index.js'));

Object.defineProperty(globalThis, 'crypto', {
  value: require('node:crypto').webcrypto,
  configurable: true,
});
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
globalThis.document = {};
globalThis.window = { document: globalThis.document };
globalThis.Navigator = class Navigator {};

const metadata = {
  name: 'fixture', stable: true, entropy: 5, weight: 1, category: 'browser',
};
const collector = (name, data) => ({
  name,
  metadata: { ...metadata, name },
  collect: () => data,
  isSupported: () => true,
});
const make = (options = {}, collectors = [collector('fixture', 'fixed')]) => {
  const fp = new sdk.Fingerprint(options);
  // Injection réservée à cette reproduction, pas une API publique du SDK.
  fp.collectors = collectors;
  return fp;
};
async function compare(a, b) {
  const [x, y] = await Promise.all([a.generate(), b.generate()]);
  return {
    sameHash: x.fingerprint === y.fingerprint,
    componentsA: x.components,
    componentsB: y.components,
  };
}

(async () => {
  const results = {};
  results.customKeyOrder = await compare(
    make({ customData: { a: 1, b: 2 } }),
    make({ customData: { b: 2, a: 1 } }),
  );
  results.nestedTimestamp = await compare(
    make({ customData: { meta: { timestamp: 1 } } }),
    make({ customData: { meta: { timestamp: 2 } } }),
  );
  results.uuidUserId = await compare(
    make({ customData: { userId: '123e4567-e89b-12d3-a456-426614174000' } }),
    make({ customData: { userId: '987e6543-e21b-12d3-a456-426614174999' } }),
  );

  const empty = await make({}, []).generate();
  results.emptyCollectors = {
    confidence: empty.confidence,
    finiteConfidence: Number.isFinite(empty.confidence),
    fingerprint: empty.fingerprint,
  };
  const fallback = await make({}, [
    collector('canvas', 'no-canvas-context'),
    collector('battery', { supported: false }),
    collector('mediaDevices', {
      hasMediaDevices: false, audioInputs: 0, audioOutputs: 0, videoInputs: 0,
    }),
  ]).generate();
  results.unsupported = {
    confidence: fallback.confidence,
    entropy: fallback.entropy,
    components: fallback.components,
  };

  const shared = { v: 1 };
  results.repeatedReference = {
    shared: sdk.safeStringify({ a: shared, b: shared }),
    duplicated: sdk.safeStringify({ a: { v: 1 }, b: { v: 1 } }),
  };
  const noCrypto = { exports: {}, console, setTimeout, clearTimeout };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'dist/index.js'), 'utf8'), noCrypto);
  results.sha256Fallback = {
    hashA: await noCrypto.exports.sha256('Aa'),
    hashB: await noCrypto.exports.sha256('BB'),
    length: (await noCrypto.exports.sha256('abc')).length,
  };

  const started = [];
  const slow = (name) => ({
    ...collector(name, name),
    collect: () => {
      started.push(name);
      return new Promise(resolve => setTimeout(() => resolve(name), 60));
    },
  });
  const t = performance.now();
  const promise = make({ timeout: 1, parallel: false }, [slow('a'), slow('b')]).generate();
  results.options = { startedImmediately: started.slice() };
  await promise;
  results.options.durationMs = Math.round(performance.now() - t);
  const hung = make({ timeout: 1 }, [{
    ...collector('hang', ''), collect: () => new Promise(() => {}),
  }]);
  results.hung = await Promise.race([
    hung.generate().then(() => 'settled'),
    new Promise(resolve => setTimeout(
      () => resolve('still pending after 50 ms with timeout=1'), 50,
    )),
  ]);

  const baseline = {
    userAgent: 'Mozilla/5.0 Safari/605.1.15',
    language: ['fr-FR'],
    screen: { width: 1440, height: 900, colorDepth: 24 },
  };
  const summary = data => {
    const r = sdk.SuspectAnalyzer.analyze(data);
    return { score: r.score, riskLevel: r.riskLevel, signals: r.signals.map(s => s.type) };
  };
  results.analysis = {
    normal: summary(baseline),
    empty: summary({}),
    excludedTwoBasics: summary({ userAgent: baseline.userAgent }),
  };
  results.version = {
    package: require(path.join(root, 'package.json')).version,
    sdk: sdk.VERSION,
  };
  console.log(JSON.stringify(results, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
