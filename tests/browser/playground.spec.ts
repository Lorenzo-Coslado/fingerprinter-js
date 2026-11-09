import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-sdk-ready', 'true');
});

test('starts without collection and generates comparable browser observations', async ({
  page,
}) => {
  await expect(page.locator('#emptyState')).toBeVisible();
  await expect(page.locator('#resultContent')).toBeHidden();
  await expect(page.locator('#fingerprintValue')).toHaveText('');
  await page.getByRole('radio', { name: /Minimal/ }).check();
  await page.locator('#generateBtn').click();
  await expect(page.locator('#fingerprintValue')).toHaveText(/^[0-9a-f]{64}$/);
  const first = await page.locator('#fingerprintValue').textContent();
  await expect(page.locator('#coverageValue')).toHaveText('100%');
  await expect(page.locator('#componentsBody tr[data-collector]')).toHaveCount(5);
  await page.locator('#generateBtn').click();
  await expect(page.locator('#comparisonSummary')).toContainText('Same fingerprint');
  await expect(page.locator('#fingerprintValue')).toHaveText(first!);
  await page.locator('#showExcluded').check();
  await expect(page.locator('#componentsBody tr[data-collector]')).toHaveCount(19);
});

test('runs eight real browser self-tests', async ({ page }) => {
  await page.locator('#tab-checks').click();
  await page.locator('#runChecksBtn').click();
  await expect(page.locator('#checksSummary')).toContainText('Finished. 8 passed', {
    timeout: 15_000,
  });
  await expect(page.locator('#checksList .check-status[data-state="pass"]')).toHaveCount(8);
  await expect(page.locator('#checksList .check-status[data-state="fail"]')).toHaveCount(0);
});

test('exports only an allow-listed diagnostic summary', async ({ page }) => {
  await page.locator('#generateBtn').click();
  await expect(page.locator('#resultContent')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportDiagnostic').click();
  const download = await downloadPromise;
  const filename = await download.path();
  expect(filename).not.toBeNull();
  const data = JSON.parse(await readFile(filename!, 'utf8'));
  expect(data.redacted).toBe(true);
  expect(data.version).toBe('3.0.0');
  expect(data).not.toHaveProperty('fingerprint');
  expect(data).not.toHaveProperty('components');
  expect(data).not.toHaveProperty('suspectAnalysis');
  for (const value of Object.values(data.collectors)) {
    expect(Object.keys(value as object).sort()).toEqual(['duration', 'status']);
  }
});

test('supports keyboard tabs and a small dark viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.locator('#tab-playground').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-explained')).toBeFocused();
  await expect(page.locator('#panel-explained')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.locator('#tab-checks')).toBeFocused();
  await expect(page.locator('#panel-checks')).toBeVisible();
  await page.locator('#tab-playground').click();
  await page.locator('#generateBtn').click();
  await expect(page.locator('#resultContent')).toBeVisible();
  await page.locator('#componentsBody tr[data-collector="userAgent"] .collector-toggle').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#themeToggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('shows empty selection and blocked network choices without a misleading confidence', async ({
  page,
}) => {
  await page.locator('.collector-settings > summary').click();
  for (const input of await page.locator('#collectorOptions input').all()) await input.uncheck();
  await page.locator('#generateBtn').click();
  await expect(page.locator('#runStatus')).toHaveText('No signals');
  await expect(page.locator('#coverageValue')).toHaveText('0%');
  await expect(page.locator('.coverage-note')).toContainText('does not distinguish');
  await page.locator('#collectorOptions input[data-collector="webrtc"]').check();
  await page.locator('#generateBtn').click();
  await expect(page.locator('#componentsBody tr[data-collector="webrtc"]')).toContainText(
    'Blocked',
  );
});

test('cancels a pending collection and restores usable controls', async ({ page }) => {
  // A controlled pending browser API exercises UI cancellation without network traffic.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: () => new Promise(() => {}) },
    });
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-sdk-ready', 'true');
  await page.getByRole('radio', { name: /Diagnostic/ }).check();
  await page.locator('#generateBtn').click();
  await page.locator('#cancelBtn').click();
  await expect(page.locator('#runStatus')).toHaveText('Cancelled');
  await expect(page.locator('#generateBtn')).toBeEnabled();
  await expect(page.locator('#cancelBtn')).toBeHidden();
  await expect(page.locator('#componentsBody tr[data-collector="permissions"]')).toContainText(
    'Cancelled',
  );
});

test('renders browser observations as text rather than HTML', async ({ browser }) => {
  const context = await browser.newContext({
    userAgent: '<img src=x onerror="document.documentElement.dataset.injected=1">',
  });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-sdk-ready', 'true');
    await page.locator('#generateBtn').click();
    await expect(page.locator('#resultContent')).toBeVisible();
    await page.locator('#componentsBody tr[data-collector="userAgent"] .collector-toggle').click();
    await expect(page.locator('#componentsBody')).toContainText('<img src=x');
    await expect(page.locator('#componentsBody img')).toHaveCount(0);
    expect(await page.locator('html').getAttribute('data-injected')).toBeNull();
  } finally {
    await context.close();
  }
});
