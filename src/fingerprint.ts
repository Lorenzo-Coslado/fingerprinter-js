import { SuspectAnalyzer } from './suspect-analyzer';
import { DEFAULT_OPTIONS, FINGERPRINT_VERSION, FingerprintError, VERSION } from './types';
import type {
  CollectorContext,
  CollectorDescriptor,
  CollectorResult,
  CollectorResults,
  ComponentCollector,
  Components,
  FingerprintOptions,
  FingerprintResult,
  GenerationOptions,
} from './types';
import { errorMessage, isBrowser, safeStringify, sha256 } from './utils';
import { COLLECTOR_REGISTRY, getCollectorMetadata } from './collectors/registry';
import { collectAutomationSnapshot } from './collectors/automation';

interface Task {
  collector: ComponentCollector;
  project?: (value: unknown) => unknown;
  blocked?: string;
}
interface Collection {
  components: Components;
  collectorResults: CollectorResults;
  projected: Record<string, unknown>;
  selected: number;
  succeeded: number;
  started: number;
}
const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const snapshot = <T>(value: T): T => JSON.parse(safeStringify(value)) as T;

function failure(error: unknown, duration: number): CollectorResult {
  let status: Exclude<CollectorResult['status'], 'ok'> = 'error';
  if (error instanceof FingerprintError) {
    if (error.code === 'UNSUPPORTED') status = 'unsupported';
    if (error.code === 'BLOCKED') status = 'blocked';
    if (error.code === 'COLLECTOR_TIMEOUT') status = 'timeout';
    if (error.code === 'ABORTED') status = 'aborted';
  } else if (error && typeof error === 'object' && 'name' in error) {
    if (['NotAllowedError', 'SecurityError'].includes(String(error.name))) status = 'blocked';
    if (error.name === 'NotSupportedError') status = 'unsupported';
    if (error.name === 'AbortError') status = 'aborted';
  }
  return { status, duration, reason: errorMessage(error) };
}
function validateObservation(value: unknown, name: string): void {
  if (
    value === undefined ||
    value === 'unknown' ||
    value === 'no-canvas' ||
    value === 'no-canvas-context'
  ) {
    throw new FingerprintError(`${name} did not return an observation`, 'UNSUPPORTED', name);
  }
  if (value && typeof value === 'object') {
    const data = value as Record<string, unknown>;
    if (data.supported === false || data.hasMediaDevices === false || data.hasWebRTC === false) {
      throw new FingerprintError(`${name} is unsupported`, 'UNSUPPORTED', name);
    }
    if (typeof data.error === 'string') {
      throw new FingerprintError(
        data.error,
        /timeout/i.test(data.error) ? 'COLLECTOR_TIMEOUT' : 'COLLECTOR_ERROR',
        name,
      );
    }
  }
}

function validateSignal(signal: unknown): void {
  if (
    signal !== undefined &&
    (!signal ||
      typeof signal !== 'object' ||
      !('aborted' in signal) ||
      typeof signal.aborted !== 'boolean' ||
      !('addEventListener' in signal) ||
      typeof signal.addEventListener !== 'function' ||
      !('removeEventListener' in signal) ||
      typeof signal.removeEventListener !== 'function')
  ) {
    throw new FingerprintError('signal must be an AbortSignal', 'INVALID_INPUT');
  }
}

/** On-demand, local browser observations with a versioned SHA-256 projection. */
export class Fingerprint {
  private readonly options: FingerprintOptions;

  constructor(options: FingerprintOptions = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new FingerprintError('Options must be an object', 'INVALID_INPUT');
    }
    this.options = {
      ...DEFAULT_OPTIONS,
      ...Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)),
    };
    validateSignal(this.options.signal);
    if (!['minimal', 'balanced', 'diagnostic'].includes(this.options.profile ?? '')) {
      throw new FingerprintError('Unknown collection profile', 'INVALID_INPUT');
    }
    for (const field of ['timeout', 'timeBudget'] as const) {
      const value = this.options[field];
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value <= 0 ||
        value > 2147483647
      ) {
        throw new FingerprintError(
          `${field} must be a positive timer-safe number`,
          'INVALID_INPUT',
        );
      }
    }
    if (!['disabled', 'enabled'].includes(this.options.network ?? '')) {
      throw new FingerprintError('network must be disabled or enabled', 'INVALID_INPUT');
    }
    if (this.options.namespace !== undefined && typeof this.options.namespace !== 'string') {
      throw new FingerprintError('namespace must be a string', 'INVALID_INPUT');
    }
    if (this.options.collectors !== undefined) {
      if (
        !Array.isArray(this.options.collectors) ||
        this.options.collectors.some(
          (name) => !COLLECTOR_REGISTRY.some((entry) => entry.name === name),
        )
      ) {
        throw new FingerprintError('Unknown collector selection', 'INVALID_INPUT');
      }
      this.options.collectors = [...new Set(this.options.collectors)];
    }
    for (const field of ['customData', 'fingerprintData'] as const) {
      const value = this.options[field];
      if (value !== undefined) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          throw new FingerprintError(`${field} must be a JSON object`, 'INVALID_INPUT');
        }
        this.options[field] = snapshot(value);
      }
    }
    if (
      this.options.customCollectors !== undefined &&
      !Array.isArray(this.options.customCollectors)
    ) {
      throw new FingerprintError('customCollectors must be an array', 'INVALID_INPUT');
    }
    const names = new Set<string>(COLLECTOR_REGISTRY.map((entry) => entry.name));
    for (const collector of this.options.customCollectors ?? []) {
      if (
        !collector ||
        typeof collector !== 'object' ||
        typeof collector.name !== 'string' ||
        !collector.metadata ||
        typeof collector.metadata !== 'object' ||
        collector.metadata.name !== collector.name ||
        typeof collector.metadata.stable !== 'boolean' ||
        !['browser', 'hardware', 'network', 'graphics', 'audio', 'storage', 'permissions'].includes(
          collector.metadata.category,
        ) ||
        (collector.project !== undefined && typeof collector.project !== 'function') ||
        !/^[A-Za-z][A-Za-z0-9_-]*$/.test(collector.name) ||
        names.has(collector.name) ||
        ['constructor', 'prototype', 'custom', 'automation'].includes(collector.name) ||
        typeof collector.collect !== 'function' ||
        typeof collector.isSupported !== 'function'
      ) {
        throw new FingerprintError(
          'Custom collector names must be unique, safe and non-reserved',
          'INVALID_INPUT',
        );
      }
      names.add(collector.name);
    }
    this.options.customCollectors = [...(this.options.customCollectors ?? [])];
    if (this.options.iceServers !== undefined && !Array.isArray(this.options.iceServers)) {
      throw new FingerprintError('iceServers must be an array', 'INVALID_INPUT');
    }
    this.options.iceServers = this.options.iceServers ? snapshot(this.options.iceServers) : [];
  }

  private async collect(options: GenerationOptions): Promise<Collection> {
    if (!isBrowser())
      throw new FingerprintError('Collection requires a browser environment', 'NOT_BROWSER');
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new FingerprintError('Generation options must be an object', 'INVALID_INPUT');
    }
    const signal = options.signal ?? this.options.signal;
    validateSignal(signal);
    const started = now();
    const deadline = started + (this.options.timeBudget ?? DEFAULT_OPTIONS.timeBudget);
    const components = Object.create(null) as Components;
    const collectorResults = Object.create(null) as CollectorResults;
    const projected = Object.create(null) as Record<string, unknown>;
    const automation =
      this.options.includeSuspectAnalysis && !signal?.aborted
        ? collectAutomationSnapshot()
        : undefined;
    const tasks: Task[] = [];
    for (const entry of COLLECTOR_REGISTRY) {
      const enabled = this.options.collectors
        ? this.options.collectors.includes(entry.name)
        : entry.profiles.includes(this.options.profile ?? DEFAULT_OPTIONS.profile);
      if (!enabled || this.options[entry.exclude] === true) {
        collectorResults[entry.name] = {
          status: 'excluded',
          duration: 0,
          reason: 'Not selected by this configuration',
        };
        continue;
      }
      tasks.push({
        collector: entry.create(this.options),
        project: entry.project,
        ...(entry.network && this.options.network !== 'enabled'
          ? { blocked: 'Network collection is disabled' }
          : {}),
      });
    }
    for (const collector of this.options.customCollectors ?? []) {
      tasks.push({
        collector,
        project: collector.project ? (value) => collector.project?.(value) : undefined,
        ...(collector.metadata.network && this.options.network !== 'enabled'
          ? { blocked: 'Network collection is disabled' }
          : {}),
      });
    }
    const globalController = new AbortController();
    let stopCode: 'ABORTED' | 'COLLECTOR_TIMEOUT' = 'COLLECTOR_TIMEOUT';
    const cancel = (): void => {
      stopCode = 'ABORTED';
      globalController.abort();
    };
    const budgetTimer = setTimeout(() => globalController.abort(), Math.max(0, deadline - now()));
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, { once: true });
    let succeeded = 0;
    const run = async ({ collector, project, blocked }: Task): Promise<void> => {
      const begin = now();
      const localDeadline = Math.min(
        begin + (this.options.timeout ?? DEFAULT_OPTIONS.timeout),
        deadline,
      );
      const controller = new AbortController();
      const cleanups: Array<() => void> = [];
      let finished = false;
      let localCode: 'ABORTED' | 'COLLECTOR_TIMEOUT' = 'COLLECTOR_TIMEOUT';
      const stop = (): void => {
        localCode = stopCode;
        controller.abort();
      };
      const timeout = (): void => {
        localCode = 'COLLECTOR_TIMEOUT';
        controller.abort();
      };
      let timer: ReturnType<typeof setTimeout> | undefined;
      let abortListener: (() => void) | undefined;
      const stopped = (): FingerprintError =>
        new FingerprintError(
          localCode === 'ABORTED' ? 'Collection cancelled' : 'Collection deadline exceeded',
          localCode,
          collector.name,
        );
      const assertActive = (): void => {
        if (globalController.signal.aborted) {
          localCode = stopCode;
          controller.abort();
        }
        if (controller.signal.aborted) throw stopped();
        // Synchronous work and promise microtasks can finish before timer callbacks run.
        if (now() >= localDeadline) {
          localCode = 'COLLECTOR_TIMEOUT';
          controller.abort();
          throw stopped();
        }
      };
      const context: CollectorContext = {
        signal: controller.signal,
        onCleanup: (cleanup) => {
          if (finished) cleanup();
          else cleanups.push(cleanup);
        },
      };
      try {
        assertActive();
        if (blocked) throw new FingerprintError(blocked, 'BLOCKED', collector.name);
        globalController.signal.addEventListener('abort', stop, { once: true });
        timer = setTimeout(timeout, Math.max(0, localDeadline - now()));
        const cancellation = new Promise<never>((_resolve, reject) => {
          abortListener = (): void => reject(stopped());
          controller.signal.addEventListener('abort', abortListener, { once: true });
        });
        const work = Promise.resolve().then(() => {
          assertActive();
          if (!collector.isSupported())
            throw new FingerprintError(
              `${collector.name} is unsupported`,
              'UNSUPPORTED',
              collector.name,
            );
          assertActive();
          return collector.collect(context);
        });
        const data = await Promise.race([work, cancellation]);
        assertActive();
        validateObservation(data, collector.name);
        assertActive();
        const value = snapshot(data);
        assertActive();
        let projectedValue: unknown;
        if (project) {
          const projection = project(value);
          assertActive();
          if (projection !== undefined) projectedValue = snapshot(projection);
        }
        assertActive();
        if (projectedValue !== undefined) projected[collector.name] = projectedValue;
        Object.assign(components, { [collector.name]: value });
        collectorResults[collector.name] = { status: 'ok', duration: now() - begin, value };
        succeeded++;
      } catch (error) {
        let cause = error;
        try {
          assertActive();
        } catch (interruption) {
          cause = interruption;
        }
        collectorResults[collector.name] = failure(cause, now() - begin);
      } finally {
        finished = true;
        if (timer !== undefined) clearTimeout(timer);
        globalController.signal.removeEventListener('abort', stop);
        if (abortListener) controller.signal.removeEventListener('abort', abortListener);
        // A collector may ignore cancellation; registered resources still belong to this invocation.
        for (const cleanup of cleanups.reverse()) {
          try {
            cleanup();
          } catch {
            /* best-effort release */
          }
        }
      }
    };
    try {
      if (this.options.parallel) await Promise.all(tasks.map(run));
      else for (const task of tasks) await run(task);
    } finally {
      clearTimeout(budgetTimer);
      signal?.removeEventListener('abort', cancel);
    }
    if (this.options.customData !== undefined)
      components.custom = snapshot(this.options.customData);
    if (automation !== undefined) components.automation = automation;
    return { components, collectorResults, projected, selected: tasks.length, succeeded, started };
  }

  /** Cancellation returns observable partial results with aborted collector statuses. */
  async generate(options: GenerationOptions = {}): Promise<FingerprintResult> {
    const collection = await this.collect(options);
    const { projected, collectorResults, selected, succeeded } = collection;
    const hashComponents = Object.keys(projected).sort();
    const source = {
      schema: FINGERPRINT_VERSION,
      namespace: this.options.namespace ?? 'fingerprinter-js',
      components: projected,
      ...(this.options.fingerprintData !== undefined ? { data: this.options.fingerprintData } : {}),
    };
    const fingerprint = await sha256(safeStringify(source));
    const collectionCoverage = selected === 0 ? 0 : Math.round((succeeded / selected) * 100);
    const suspectAnalysis = this.options.includeSuspectAnalysis
      ? SuspectAnalyzer.analyze(collection.components)
      : undefined;
    const include = options.includeComponents ?? this.options.includeComponents;
    if (!include) {
      for (const [name, result] of Object.entries(collectorResults)) {
        if (result.status === 'ok')
          collectorResults[name] = { status: 'ok', duration: result.duration };
      }
    }
    return {
      fingerprint,
      fingerprintVersion: FINGERPRINT_VERSION,
      hashComponents,
      quality:
        hashComponents.length === 0 && !Object.keys(this.options.fingerprintData ?? {}).length
          ? 'empty'
          : succeeded === selected
            ? 'complete'
            : 'partial',
      components: include ? collection.components : {},
      collectorResults,
      collectionCoverage,
      confidence: collectionCoverage,
      entropy: null,
      duration: now() - collection.started,
      version: VERSION,
      ...(suspectAnalysis ? { suspectAnalysis } : {}),
    };
  }

  /** Uses the same selection, lifecycle and deadline engine as generate(). */
  async getComponents(options: GenerationOptions = {}): Promise<Components> {
    const result = await this.collect(options);
    return (options.includeComponents ?? this.options.includeComponents) ? result.components : {};
  }
  static generate(options: FingerprintOptions = {}): Promise<FingerprintResult> {
    return new Fingerprint(options).generate();
  }
  static getAvailableCollectors(): string[] {
    return COLLECTOR_REGISTRY.map((entry) => entry.name);
  }
  static getCollectorMetadata(): CollectorDescriptor[] {
    return getCollectorMetadata();
  }
  static getVersion(): string {
    return VERSION;
  }
}
export function createFingerprinter(options: FingerprintOptions = {}): Fingerprint {
  return new Fingerprint(options);
}
export default Fingerprint;
