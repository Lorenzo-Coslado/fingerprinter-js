const $ = (id) => document.getElementById(id);
const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

let sdk;
let metadata = [];
let customSelection = null;
let lastResult = null;
let lastOptions = null;
let previousResult = null;
let runNumber = 0;
let operation = null;
let toastTimer;
let pipelineTimer;

const statusLabels = {
  ok: 'Collected',
  unsupported: 'Unsupported',
  blocked: 'Blocked',
  timeout: 'Timed out',
  error: 'Error',
  excluded: 'Excluded',
  aborted: 'Cancelled',
};

const profile = () => document.querySelector('input[name="profile"]:checked').value;
const profileNames = () =>
  metadata.filter((item) => item.profiles.includes(profile())).map((item) => item.name);
const selectedNames = () => (customSelection ? [...customSelection] : profileNames());
const numericTime = (value) => (Number.isFinite(value) ? `${Math.round(value * 10) / 10} ms` : '—');
const isBusy = () => operation !== null;

function getOptions(signal) {
  const options = {
    profile: profile(),
    timeout: Number($('timeout').value),
    timeBudget: Number($('timeBudget').value),
    parallel: $('parallel').checked,
    network: $('network').checked ? 'enabled' : 'disabled',
    includeSuspectAnalysis: $('includeAnalysis').checked,
  };
  if (customSelection) options.collectors = [...customSelection];
  if (signal) options.signal = signal;
  return options;
}

function validateSettings() {
  for (const id of ['timeout', 'timeBudget']) {
    const input = $(id);
    if (!input.checkValidity()) {
      selectTab('playground');
      input.closest('details').open = true;
      input.focus();
      input.reportValidity();
      return false;
    }
  }
  return true;
}

function updateExample() {
  if (!sdk) return;
  const options = getOptions();
  const lines = Object.entries(options).map(
    ([key, value]) => `  ${key}: ${JSON.stringify(value)},`,
  );
  $('usageCode').textContent =
    `import { Fingerprint } from "fingerprinter-js";\n\nconst result = await Fingerprint.generate({\n${lines.join('\n')}\n});\n\nconsole.log(result.fingerprint);\nconsole.log(result.collectionCoverage);`;
  $('selectionCount').textContent = `${selectedNames().length} / ${metadata.length}`;
  $('networkNote').lastChild.textContent = $('network').checked
    ? 'Network collectors allowed; no STUN server'
    : 'No network collectors enabled';
}

function renderCollectorChoices() {
  const selected = new Set(selectedNames());
  const fragment = document.createDocumentFragment();
  for (const item of metadata) {
    const label = make('label', 'collector-choice');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = item.name;
    input.checked = selected.has(item.name);
    input.dataset.collector = item.name;
    input.addEventListener('change', () => {
      if (!customSelection) customSelection = new Set(profileNames());
      if (input.checked) customSelection.add(item.name);
      else customSelection.delete(item.name);
      updateExample();
    });
    label.append(input, make('span', '', item.name));
    if (item.network) label.append(make('span', 'network-indicator', 'network'));
    fragment.append(label);
  }
  $('collectorOptions').replaceChildren(fragment);
  updateExample();
}

function setRunStatus(text, state = '') {
  const badge = $('runStatus');
  badge.dataset.state = state;
  badge.replaceChildren(make('span', 'badge-dot'), document.createTextNode(text));
}

function setBusy(kind, controller) {
  operation = kind ? { kind, controller } : null;
  $('generateBtn').disabled = !sdk || isBusy();
  $('runChecksBtn').disabled = !sdk || isBusy();
  $('cancelBtn').hidden = kind !== 'collection';
  $('stopChecksBtn').hidden = kind !== 'checks';
  $('resultPanel').setAttribute('aria-busy', String(kind === 'collection'));
  for (const input of $('settingsForm').querySelectorAll('input')) input.disabled = isBusy();
  $('resetCollectors').disabled = isBusy();
}

function showToast(text) {
  clearTimeout(toastTimer);
  $('toast').textContent = text;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => {
    $('toast').hidden = true;
  }, 2800);
}

async function copyText(text, success) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const input = make('textarea', 'sr-only');
      input.value = text;
      document.body.append(input);
      input.select();
      const copied = document.execCommand('copy');
      input.remove();
      if (!copied) throw new Error('Clipboard unavailable');
    }
    showToast(success);
  } catch {
    showToast('Clipboard access is unavailable. Select and copy the visible text.');
  }
}

function renderComponents(result) {
  const fragment = document.createDocumentFragment();
  const known = new Map(metadata.map((item) => [item.name, item]));
  const hashInputs = new Set(result.hashComponents ?? []);
  let visible = 0;
  for (const [name, collected] of Object.entries(result.collectorResults)) {
    if (collected.status === 'excluded' && !$('showExcluded').checked) continue;
    visible++;
    const item = known.get(name);
    const row = document.createElement('tr');
    row.dataset.collector = name;
    const descriptionCell = document.createElement('td');
    const toggle = make('button', 'collector-toggle', name);
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    const detailId = `component-detail-${visible}`;
    toggle.setAttribute('aria-controls', detailId);
    const detailRow = make('tr', 'component-detail-row');
    detailRow.id = detailId;
    detailRow.hidden = true;
    const detailCell = document.createElement('td');
    detailCell.colSpan = 4;
    const details = make('div', 'collector-detail');
    if (item?.description) details.append(make('p', 'component-description', item.description));
    const detail =
      collected.status === 'ok'
        ? JSON.stringify(collected.value ?? result.components[name], null, 2)
        : collected.reason || statusLabels[collected.status] || collected.status;
    const maxLength = 12000;
    details.append(
      make(
        'pre',
        '',
        typeof detail === 'string' && detail.length > maxLength
          ? `${detail.slice(0, maxLength)}\n… value truncated for display`
          : (detail ?? 'No value returned.'),
      ),
    );
    detailCell.append(details);
    detailRow.append(detailCell);
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      detailRow.hidden = open;
    });
    descriptionCell.append(toggle);
    const stateCell = document.createElement('td');
    stateCell.append(
      make(
        'span',
        `state-badge state-${collected.status}`,
        statusLabels[collected.status] || collected.status,
      ),
    );
    const hashCell = make('td', '', hashInputs.has(name) ? 'Included' : '—');
    hashCell.title = hashInputs.has(name)
      ? 'Eligible fields from this collector contribute to the fingerprint.'
      : 'This collector did not contribute to this fingerprint.';
    const compactTime =
      collected.duration >= 1000
        ? `${(collected.duration / 1000).toFixed(1)} s`
        : `${Math.round(collected.duration)} ms`;
    row.append(descriptionCell, stateCell, make('td', '', compactTime), hashCell);
    fragment.append(row, detailRow);
  }
  if (!visible) {
    const row = document.createElement('tr');
    const cell = make(
      'td',
      'empty-table',
      'No collectors ran. Enable a collector or show the exclusions.',
    );
    cell.colSpan = 4;
    row.append(cell);
    fragment.append(row);
  }
  $('componentsBody').replaceChildren(fragment);
}

function renderAnalysis(result) {
  const container = $('analysisSummary');
  container.replaceChildren();
  container.hidden = !result.suspectAnalysis;
  if (!result.suspectAnalysis) return;
  const analysis = result.suspectAnalysis;
  const insufficient = analysis.status === 'insufficient';
  const heading = make('p');
  heading.append(make('strong', '', 'Automation signals'));
  container.append(heading);
  const count = analysis.signals?.length || 0;
  container.append(
    make(
      'p',
      '',
      insufficient
        ? 'There are not enough observations to evaluate the configured heuristic groups.'
        : count
          ? `${count} heuristic signal${count === 1 ? '' : 's'} observed. This is not a decision about a person or transaction.`
          : 'No configured heuristic signal was detected. This does not establish that the browser is human-operated.',
    ),
  );
  if (count) {
    const list = document.createElement('ul');
    for (const signal of analysis.signals)
      list.append(make('li', '', signal.description || signal.type));
    container.append(list);
  }
  if (analysis.status === 'partial')
    container.append(
      make('p', '', 'Some observation groups were unavailable; this assessment is partial.'),
    );
  container.append(
    make('p', '', `Rules ${analysis.rulesVersion} · ${analysis.status} observations`),
  );
}

function renderComparison(result) {
  const container = $('comparisonSummary');
  container.replaceChildren();
  container.hidden = !previousResult;
  if (!previousResult) return;
  const comparison = sdk.compareFingerprints(previousResult, result);
  const headline = make('p');
  headline.append(
    make(
      'strong',
      '',
      comparison.sameFingerprint
        ? 'Same fingerprint as the previous run'
        : 'Fingerprint changed since the previous run',
    ),
  );
  container.append(headline);
  const changes = comparison.changes || [];
  if (!comparison.sameVersion)
    container.append(
      make(
        'p',
        '',
        'The fingerprint schema changed; these identifiers are not directly comparable.',
      ),
    );
  else if (comparison.sameFingerprint && changes.length)
    container.append(
      make(
        'p',
        '',
        'Some raw observations changed, while the fingerprint projection stayed the same.',
      ),
    );
  else if (comparison.sameFingerprint)
    container.append(
      make('p', '', 'The observations matched in these two runs. This is a short-term check only.'),
    );
  else
    container.append(
      make(
        'p',
        '',
        'Review the changed observations below. A fingerprint change does not imply a different person.',
      ),
    );
  if (changes.length) {
    const list = document.createElement('ul');
    for (const change of changes) list.append(make('li', '', `${change.name}: ${change.type}`));
    container.append(list);
  }
}

function renderResult(result, options, cancelled) {
  lastResult = result;
  lastOptions = options;
  runNumber++;
  $('emptyState').hidden = true;
  $('resultContent').hidden = false;
  $('componentsSection').hidden = false;
  $('fingerprintValue').textContent = result.fingerprint;
  const quality = result.quality || 'partial';
  $('resultMeta').textContent =
    `Run ${runNumber} · Schema ${result.fingerprintVersion} · ${options.profile} profile · ${quality} collection`;
  $('coverageValue').textContent = `${Math.round(result.collectionCoverage)}%`;
  document.querySelector('.coverage-note').textContent =
    quality === 'empty'
      ? 'No identifying signals contributed. This digest does not distinguish browser environments.'
      : 'Coverage describes collected signals, not identification accuracy.';
  $('durationValue').textContent = numericTime(result.duration);
  $('hashInputsValue').textContent = String((result.hashComponents || []).length);
  setRunStatus(
    cancelled
      ? 'Cancelled'
      : quality === 'complete'
        ? 'Complete'
        : quality === 'empty'
          ? 'No signals'
          : 'Partial',
    cancelled ? 'cancelled' : quality === 'complete' ? 'complete' : '',
  );
  renderComponents(result);
  renderAnalysis(result);
  renderComparison(result);
  previousResult = result;
}

async function generate(event) {
  event.preventDefault();
  if (!sdk || isBusy() || !validateSettings()) return;
  const controller = new AbortController();
  const options = getOptions(controller.signal);
  $('collectionError').hidden = true;
  setBusy('collection', controller);
  setRunStatus('Collecting', 'running');
  try {
    const result = await sdk.Fingerprint.generate(options);
    renderResult(result, options, controller.signal.aborted);
  } catch (error) {
    const cancelled = controller.signal.aborted;
    setRunStatus(cancelled ? 'Cancelled' : 'Failed', cancelled ? 'cancelled' : 'error');
    $('collectionError').textContent = cancelled
      ? 'Collection was cancelled. You can start a new run.'
      : `${error.message || 'Collection failed.'} Check the settings and try again.`;
    $('collectionError').hidden = false;
  } finally {
    setBusy(null);
  }
}

function exportDiagnostic() {
  if (!lastResult) return;
  // Allow-list metadata only: no fingerprint, values, raw reasons, UA, IPs or context.
  const diagnostic = {
    redacted: true,
    library: 'fingerprinter-js',
    version: lastResult.version,
    fingerprintVersion: lastResult.fingerprintVersion,
    profile: lastOptions.profile,
    quality: lastResult.quality,
    network: lastOptions.network,
    duration: lastResult.duration,
    collectionCoverage: lastResult.collectionCoverage,
    collectors: Object.fromEntries(
      Object.entries(lastResult.collectorResults).map(([name, value]) => [
        name,
        { status: value.status, duration: value.duration },
      ]),
    ),
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(diagnostic, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'fingerprinter-diagnostic.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Redacted diagnostic exported. No signal values or fingerprint included.');
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
class SkippedCheck extends Error {}
const checkDefinitions = [
  {
    name: 'SHA-256 known vector',
    description: 'Verify the standard digest for abc and distinguish a second input.',
    async run() {
      const hash = await sdk.sha256('abc');
      assert(
        hash === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        'Digest does not match the published SHA-256 vector.',
      );
      assert(hash !== (await sdk.sha256('abcd')), 'Different input produced the same digest.');
      return 'Known vector matched; a changed input produced a different digest.';
    },
  },
  {
    name: 'Canonical object order',
    description: 'Equivalent nested objects produce the same representation and fingerprint.',
    async run(signal) {
      const a = { b: 2, a: { z: 1, c: 3 } };
      const b = { a: { c: 3, z: 1 }, b: 2 };
      assert(
        sdk.safeStringify(a) === sdk.safeStringify(b),
        'Object key order changed canonical data.',
      );
      const first = await sdk.Fingerprint.generate({ collectors: [], fingerprintData: a, signal });
      const second = await sdk.Fingerprint.generate({ collectors: [], fingerprintData: b, signal });
      assert(
        first.fingerprint === second.fingerprint,
        'Equivalent hash inputs produced different fingerprints.',
      );
      return 'Nested keys were normalized; equivalent inputs produced the same hash.';
    },
  },
  {
    name: 'Context stays outside the fingerprint',
    description: 'A UUID is preserved as context without changing the fingerprint.',
    async run(signal) {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const a = await sdk.Fingerprint.generate({ collectors: [], customData: { userId }, signal });
      const b = await sdk.Fingerprint.generate({
        collectors: [],
        customData: { userId: 'different-context' },
        signal,
      });
      assert(a.components.custom?.userId === userId, 'The context UUID was removed or modified.');
      assert(a.fingerprint === b.fingerprint, 'Context unexpectedly changed the fingerprint.');
      return 'The UUID was preserved and context changes did not alter the hash.';
    },
  },
  {
    name: 'Explicit fingerprint data matters',
    description: 'A changed, explicitly selected input changes the fingerprint.',
    async run(signal) {
      const a = await sdk.Fingerprint.generate({
        collectors: [],
        fingerprintData: { scope: 'a' },
        signal,
      });
      const b = await sdk.Fingerprint.generate({
        collectors: [],
        fingerprintData: { scope: 'b' },
        signal,
      });
      assert(
        a.fingerprint !== b.fingerprint,
        'A changed hash input did not change the fingerprint.',
      );
      return 'Different explicit hash inputs produced different fingerprints.';
    },
  },
  {
    name: 'Empty selection is explicit',
    description: 'No collectors means zero coverage, with a finite result.',
    async run(signal) {
      const result = await sdk.Fingerprint.generate({ collectors: [], signal });
      assert(
        Number.isFinite(result.collectionCoverage) && result.collectionCoverage === 0,
        'Empty selection returned invalid coverage.',
      );
      assert(
        (result.hashComponents || []).length === 0,
        'The empty selection unexpectedly collected hash inputs.',
      );
      assert(/^[a-f0-9]{64}$/.test(result.fingerprint), 'Fingerprint is not a SHA-256 hex digest.');
      return 'Coverage was 0%; no collectors contributed to the schema-defined digest.';
    },
  },
  {
    name: 'Collector timeout is enforced',
    description: 'A deliberately pending test collector returns a timeout status.',
    async run(signal) {
      const name = 'playground-pending';
      const result = await sdk.Fingerprint.generate({
        collectors: [],
        timeout: 25,
        timeBudget: 200,
        signal,
        customCollectors: [
          {
            name,
            metadata: { name, stable: false, weight: 0, entropy: 0, category: 'browser' },
            isSupported: () => true,
            collect: () => new Promise(() => {}),
          },
        ],
      });
      assert(
        result.collectorResults[name]?.status === 'timeout',
        'The pending collector did not return a timeout status.',
      );
      return 'A 25 ms timeout ended the pending collector with an explicit status.';
    },
  },
  {
    name: 'Storage values are preserved',
    description: 'Check that the storage probe leaves a pre-existing application key intact.',
    async run(signal) {
      const key = '__fp_test__';
      let store;
      let original;
      let created = false;
      const sentinel = 'fingerprinter-playground-storage-check';
      try {
        store = window.localStorage;
        original = store.getItem(key);
        if (original === null) {
          store.setItem(key, sentinel);
          created = true;
        }
      } catch {
        throw new SkippedCheck('Local storage is blocked in this browser context.');
      }
      try {
        const result = await sdk.Fingerprint.generate({
          collectors: ['storage'],
          signal,
          timeout: 500,
          timeBudget: 750,
        });
        if (result.collectorResults.storage?.status !== 'ok')
          throw new SkippedCheck('Storage collection was unavailable in this context.');
        assert(
          store.getItem(key) === (created ? sentinel : original),
          'The collector changed a pre-existing storage key.',
        );
        return 'The pre-existing application key was unchanged after collection.';
      } finally {
        if (created) {
          if (store.getItem(key) === sentinel) store.removeItem(key);
        } else if (store.getItem(key) !== original) store.setItem(key, original);
      }
    },
  },
  {
    name: 'Repeatability in this browser',
    description: 'Compare two immediate runs using the current playground settings.',
    async run(signal) {
      const a = await sdk.Fingerprint.generate(getOptions(signal));
      const b = await sdk.Fingerprint.generate(getOptions(signal));
      if (signal.aborted) throw new SkippedCheck('Checks were stopped.');
      if (a.quality === 'empty' || b.quality === 'empty')
        throw new SkippedCheck('No identifying signals were available with this configuration.');
      const comparison = sdk.compareFingerprints(a, b);
      assert(
        comparison.sameFingerprint,
        `The fingerprint changed. Changed observations: ${(comparison.changes || []).map((item) => item.name).join(', ') || 'projection availability'}. Protection settings or collection availability can affect repeatability.`,
      );
      return 'These two immediate runs matched. Long-term stability is not established.';
    },
  },
];

function renderChecks() {
  const fragment = document.createDocumentFragment();
  checkDefinitions.forEach((check, index) => {
    const row = make('li', 'check-row');
    row.id = `check-${index}`;
    const text = make('div');
    text.append(
      make('h3', '', check.name),
      make('p', '', check.description),
      make('p', 'check-detail'),
    );
    row.append(text, make('span', 'check-status', 'Not run'));
    fragment.append(row);
  });
  $('checksList').replaceChildren(fragment);
}

function setCheck(index, state, detail = '') {
  const row = $(`check-${index}`);
  const badge = row.querySelector('.check-status');
  badge.dataset.state = state;
  badge.textContent = {
    pending: 'Not run',
    running: 'Running',
    pass: 'Passed',
    fail: 'Failed',
    skip: 'Skipped',
  }[state];
  row.querySelector('.check-detail').textContent = detail;
}

async function runChecks() {
  if (!sdk || isBusy() || !validateSettings()) return;
  const controller = new AbortController();
  setBusy('checks', controller);
  renderChecks();
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  try {
    for (let index = 0; index < checkDefinitions.length; index++) {
      if (controller.signal.aborted) {
        skipped++;
        setCheck(index, 'skip', 'Checks were stopped.');
        continue;
      }
      $('checksSummary').textContent = `Running check ${index + 1} of ${checkDefinitions.length}…`;
      setCheck(index, 'running');
      try {
        const detail = await checkDefinitions[index].run(controller.signal);
        if (controller.signal.aborted) {
          skipped++;
          setCheck(index, 'skip', 'Checks were stopped.');
        } else {
          passed++;
          setCheck(index, 'pass', detail);
        }
      } catch (error) {
        if (error instanceof SkippedCheck || controller.signal.aborted) {
          skipped++;
          setCheck(index, 'skip', error.message);
        } else {
          failed++;
          setCheck(index, 'fail', error.message || 'Check failed.');
        }
      }
    }
    const prefix = controller.signal.aborted ? 'Stopped.' : 'Finished.';
    $('checksSummary').textContent =
      `${prefix} ${passed} passed · ${failed} failed · ${skipped} skipped. Results describe this build and browser context only.`;
    $('checksTabCount').hidden = false;
    $('checksTabCount').textContent = `${passed}/${checkDefinitions.length}`;
  } finally {
    setBusy(null);
  }
}

function selectTab(name, focus = false) {
  for (const tab of document.querySelectorAll('[data-tab]')) {
    const active = tab.dataset.tab === name;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    $(`panel-${tab.dataset.tab}`).hidden = !active;
    if (active && focus) tab.focus();
  }
}

document.querySelectorAll('[data-tab]').forEach((tab, index, tabs) => {
  tab.addEventListener('click', () => selectTab(tab.dataset.tab));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(tabs[next].dataset.tab, true);
  });
});

$('settingsForm').noValidate = true;
$('settingsForm').addEventListener('submit', generate);
$('settingsForm').addEventListener('input', (event) => {
  if (event.target.name === 'profile') {
    customSelection = null;
    renderCollectorChoices();
  } else updateExample();
});
$('resetCollectors').addEventListener('click', () => {
  customSelection = null;
  renderCollectorChoices();
});
$('cancelBtn').addEventListener('click', () => operation?.controller.abort());
$('stopChecksBtn').addEventListener('click', () => operation?.controller.abort());
$('showExcluded').addEventListener('change', () => {
  if (lastResult) renderComponents(lastResult);
});
$('copyFingerprint').addEventListener('click', () => {
  if (lastResult) void copyText(lastResult.fingerprint, 'Fingerprint copied.');
});
$('copyExample').addEventListener(
  'click',
  () => void copyText($('usageCode').textContent, 'Configuration copied.'),
);
$('exportDiagnostic').addEventListener('click', exportDiagnostic);
$('runChecksBtn').addEventListener('click', () => void runChecks());
$('themeToggle').addEventListener('click', () => {
  const current = getComputedStyle(document.documentElement).colorScheme;
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  $('themeToggle').setAttribute(
    'aria-label',
    `Switch to ${next === 'dark' ? 'light' : 'dark'} theme`,
  );
});
$('replayPipeline').addEventListener('click', () => {
  clearTimeout(pipelineTimer);
  $('pipeline').dataset.playing = 'false';
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      $('pipeline').dataset.playing = 'true';
    }),
  );
  pipelineTimer = setTimeout(() => {
    $('pipeline').dataset.playing = 'false';
  }, 3200);
});

renderChecks();

try {
  sdk = await import('./sdk/index.js');
  metadata = sdk.Fingerprint.getCollectorMetadata();
  $('sdkVersion').textContent = `v${sdk.VERSION}`;
  renderCollectorChoices();
  $('generateBtn').disabled = false;
  $('runChecksBtn').disabled = false;
  $('copyExample').disabled = false;
  document.documentElement.dataset.sdkReady = 'true';
} catch {
  sdk = null;
  $('collectionError').textContent =
    'The local SDK could not be loaded. If you are running this repository, run npm run build:demo, then npm run demo. Reload this page once the build is ready.';
  $('collectionError').hidden = false;
  $('usageCode').textContent =
    'The SDK is unavailable. Build the demo and reload to use the playground.';
  $('selectionCount').textContent = 'Unavailable';
  setRunStatus('SDK unavailable', 'error');
}
