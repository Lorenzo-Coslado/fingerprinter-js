import type { AutomationData } from '../types';

/** Capture once so analysis can replay the same observations without reading globals. */
export function collectAutomationSnapshot(): AutomationData {
  const result: AutomationData = {};
  if (typeof navigator !== 'undefined') {
    try {
      if (typeof navigator.webdriver === 'boolean') result.webdriver = navigator.webdriver;
    } catch {
      /* unavailable */
    }
    try {
      result.headless = /HeadlessChrome|PhantomJS|Headless/i.test(navigator.userAgent);
    } catch {
      /* unavailable */
    }
  }
  if (typeof window === 'undefined') return result;
  const win = window as unknown as Record<string, unknown>;
  const doc =
    typeof document === 'undefined' ? {} : (document as unknown as Record<string, unknown>);
  const has = (object: Record<string, unknown>, names: string[]): boolean =>
    names.some((name) => {
      try {
        return Boolean(object[name]);
      } catch {
        return false;
      }
    });
  result.selenium =
    has(win, ['selenium', 'webdriver']) ||
    has(doc, ['__selenium_unwrapped', '__webdriver_evaluate', '__driver_evaluate']);
  result.puppeteer = has(win, ['__puppeteer_evaluation_script__', 'puppeteerBinding']);
  result.playwright = has(win, ['__playwright', '__pw_manual', '_playwright']);
  result.phantom = has(win, ['_phantom', 'callPhantom', '__phantomas']);
  result.cdp = has(win, ['__cdp__', 'cdc_adoQpoasnfa76pfcZLmcfl_Array']);
  return result;
}
