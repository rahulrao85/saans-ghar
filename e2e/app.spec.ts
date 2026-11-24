import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { stubAir } from './fixtures';

async function axe(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

async function noSideScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function openDemo(page: Page): Promise<void> {
  await stubAir(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Mumbai family' }).click();
  await expect(page.getByRole('img', { name: 'AQI 162' })).toBeVisible();
}

test('first visit explains the app and passes axe in both themes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Saans Ghar' })).toBeVisible();
  await axe(page);
  await page.getByRole('switch', { name: 'Dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await axe(page);
  await noSideScroll(page);
});

test('a demo family gets a sourced reading and a plan with savings', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByText('Source: CPCB')).toBeVisible();
  await expect(page.getByText(/Saves ~\d+ µg of PM2\.5 for Aaji/)).toBeVisible();
  await axe(page);
  await noSideScroll(page);
});

test('the plan is explained without an AI key', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Explain' }).click();
  await expect(page.getByText('Built-in explanation', { exact: true })).toBeVisible();
  await expect(page.getByText(/Air in Chembur, Mumbai: AQI 162/)).toBeVisible();
});

test('tabs work from the keyboard and every section passes axe', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('tab', { name: 'Today' }).focus();
  for (const name of ['Family', 'Home air', 'Travel', 'Share', 'Ask']) {
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
    await axe(page);
    await noSideScroll(page);
  }
});

test('share writes a notice from the rules and links to WhatsApp', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('tab', { name: 'Share' }).click();
  await page.getByRole('button', { name: 'Write the notice' }).click();
  await expect(page.getByRole('textbox', { name: 'Notice text' })).toHaveValue(/AQI 162, Moderate/);
  await expect(page.getByRole('link', { name: 'Share on WhatsApp' })).toHaveAttribute(
    'href',
    /wa\.me/,
  );
});

test('ask answers a question about the plan', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('tab', { name: 'Ask' }).click();
  await page.getByRole('button', { name: 'Do masks help?' }).click();
  await expect(page.getByText(/well fitted: an N95/)).toBeVisible();
});

test('security headers are set', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.headers()['content-security-policy']).toContain("default-src 'self'");
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
});
