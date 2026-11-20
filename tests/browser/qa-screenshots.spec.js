import {test, expect} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifactDir = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts';
const fullSha = process.env.SOURCE_SHA || process.env.PR_HEAD_SHA || 'unknown-sha';

function shot(name, page, testInfo) {
  const vp = testInfo.project.name === 'desktop' ? '1440' : '390';
  const file = path.join(artifactDir, `${name}-${testInfo.project.name}-${vp}-${fullSha}.png`);
  return page.screenshot({path: file, fullPage: true});
}

test.beforeAll(() => {
  fs.mkdirSync(artifactDir, {recursive: true});
  fs.writeFileSync(
    path.join(artifactDir, `SOURCE_SHA_MANIFEST-${fullSha}.txt`),
    `source_head=${fullSha}\nviewport_desktop=1440x900\nviewport_mobile=390x844\ncaptured_at=${new Date().toISOString()}\n`,
  );
});

test('timestamp UTC conversion panel', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop QA shot');
  await page.goto('./#timestamp');
  await page.selectOption('#tsDisplayZone', 'UTC');
  await page.fill('#tsInput', '0');
  await page.click('#tsFromEpoch');
  await expect(page.locator('#outputTimestamp')).toHaveValue(/1970-01-01T00:00:00\.000Z/);
  await shot('timestamp-utc-epoch0', page, testInfo);
});

test('cron UTC results with 366 help', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop QA shot');
  await page.clock.install({time: new Date('2023-12-31T23:00:00Z')});
  await page.goto('./#cron');
  await expect(page.locator('#cronWindowNote')).toBeVisible();
  await page.selectOption('#cronZone', 'UTC');
  await page.fill('#cronExpr', '0 0 1 1 *');
  await page.fill('#cronCount', '1');
  await page.click('#cronRun');
  await expect(page.locator('#statusCron')).toContainText('已生成', {timeout: 20000});
  await expect(page.locator('#outputCron')).toHaveValue(/1\. 2024-01-01 00:00:00 \(UTC\)/);
  await expect(page.locator('#outputCron')).toHaveValue(new RegExp(`${366}.*日历日`));
  await shot('cron-utc-results-366', page, testInfo);
});

test('cron no-results 366 error', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop QA shot');
  test.setTimeout(120000);
  await page.goto('./#cron');
  await page.selectOption('#cronZone', 'UTC');
  await page.fill('#cronExpr', '0 0 29 2 *');
  await page.fill('#cronCount', '5');
  await page.click('#cronRun');
  await expect(page.locator('#statusCron')).toContainText('366', {timeout: 90000});
  await shot('cron-no-results-366', page, testInfo);
});

test('cron UTC mobile selection', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile QA shot');
  await page.goto('./#cron');
  await page.selectOption('#cronZone', 'UTC');
  await expect(page.locator('#cronZone')).toHaveValue('UTC');
  await shot('cron-utc-selected', page, testInfo);
});