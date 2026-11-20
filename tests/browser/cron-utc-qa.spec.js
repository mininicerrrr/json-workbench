import {test, expect} from '@playwright/test';
import path from 'node:path';

const artifactDir = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts';
const head = (process.env.PR_HEAD_SHA || process.env.TESTED_HEAD_SHA || 'local').slice(0, 7);

test('cron shows 366-day window and no-results error within window', async ({page}, testInfo) => {
  test.setTimeout(120000);
  await page.goto('./#cron');
  await expect(page.locator('#cronWindowNote')).toContainText('366');
  await expect(page.locator('#cronWindowNote')).toContainText('不等于表达式永不运行');

  await page.selectOption('#cronZone', 'UTC');
  await page.fill('#cronExpr', '0 0 29 2 *');
  await page.fill('#cronCount', '5');
  await page.click('#cronRun');
  await expect(page.locator('#statusCron')).toContainText('366', {timeout: 15000});
  await expect(page.locator('#statusCron')).toContainText('这不表示表达式永不运行');

  if (testInfo.project.name === 'desktop') {
    await page.screenshot({
      path: path.join(artifactDir, `cron-366-no-results-desktop-1440-${head}.png`),
      fullPage: true,
    });
  }
});

test('UTC selectable in timestamp and cron with correct output', async ({page}, testInfo) => {
  await page.goto('./#timestamp');
  await expect(page.locator('#tsDisplayZone option[value="UTC"]')).toHaveCount(1);
  await page.selectOption('#tsDisplayZone', 'UTC');
  await page.fill('#tsInput', '0');
  await page.selectOption('#tsUnit', 's');
  await page.click('#tsFromEpoch');
  await expect(page.locator('#outputTimestamp')).toHaveValue(/1970-01-01/);

  await page.goto('./#cron');
  await expect(page.locator('#cronZone option[value="UTC"]')).toHaveCount(1);
  await page.selectOption('#cronZone', 'UTC');
  await page.fill('#cronExpr', '0 0 * * *');
  await page.click('#cronRun');
  await expect(page.locator('#outputCron')).toHaveValue(/366/);

  if (testInfo.project.name === 'desktop') {
    await page.screenshot({
      path: path.join(artifactDir, `utc-timestamp-cron-desktop-1440-${head}.png`),
      fullPage: true,
    });
  } else {
    await page.goto('./#cron');
    await expect(page.locator('#cronZone')).toHaveValue('UTC');
    await page.screenshot({
      path: path.join(artifactDir, `utc-cron-mobile-390-${head}.png`),
      fullPage: true,
    });
  }
});