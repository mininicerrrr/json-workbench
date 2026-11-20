import {test, expect} from '@playwright/test';
import path from 'node:path';

const artifactDir = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts';
const head = process.env.TESTED_HEAD_SHA || 'local';

test('desktop screenshots @1440x900', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop only');
  await page.goto('./#home');
  await expect(page.locator('#panelHome')).toBeVisible();
  await page.screenshot({
    path: path.join(artifactDir, `home-nav-desktop-1440-${head.slice(0, 7)}.png`),
    fullPage: true,
  });

  const h = Buffer.from(JSON.stringify({alg: 'none'})).toString('base64url');
  const p = Buffer.from(JSON.stringify({demo: '合成', warn: true})).toString('base64url');
  await page.goto('./#jwt');
  await page.fill('#jwtInput', `${h}.${p}.sig`);
  await page.click('#jwtDecode');
  await expect(page.locator('#statusJwt')).toContainText('未验证');
  await page.screenshot({
    path: path.join(artifactDir, `jwt-warning-desktop-1440-${head.slice(0, 7)}.png`),
    fullPage: true,
  });

  await page.goto('./#cron');
  await page.fill('#cronExpr', '0 9 * * 1-5');
  await page.waitForSelector('#cronZone option[value="Asia/Shanghai"]', {state: 'attached'});
  await page.selectOption('#cronZone', 'Asia/Shanghai');
  await page.click('#cronRun');
  await expect(page.locator('#outputCron')).toHaveValue(/minute: 0/);
  await expect(page.locator('#outputCron')).toHaveValue(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
  await page.screenshot({
    path: path.join(artifactDir, `cron-results-desktop-1440-${head.slice(0, 7)}.png`),
    fullPage: true,
  });
});

test('mobile screenshot @390x844', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile only');
  const h = Buffer.from(JSON.stringify({alg: 'none'})).toString('base64url');
  const p = Buffer.from(JSON.stringify({demo: 'mobile'})).toString('base64url');
  await page.goto('./#jwt');
  await page.fill('#jwtInput', `${h}.${p}.sig`);
  await page.click('#jwtDecode');
  await page.screenshot({
    path: path.join(artifactDir, `jwt-warning-mobile-390-${head.slice(0, 7)}.png`),
    fullPage: true,
  });
});