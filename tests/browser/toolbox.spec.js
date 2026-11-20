import {test, expect} from '@playwright/test';
import path from 'node:path';

const artifactDir = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts';

test('hash routes load without storing input in URL', async ({page}) => {
  await page.goto('./#jwt');
  await expect(page.locator('.jwt-banner')).toContainText('不验证签名');
  await page.fill('#jwtInput', 'a.b.c');
  const url = page.url();
  expect(url).not.toContain('a.b');
  expect(url).toMatch(/#jwt$/);
});

test('JWT shows warning state', async ({page}) => {
  await page.goto('./#jwt');
  const header = Buffer.from(JSON.stringify({alg: 'none'})).toString('base64url');
  const payload = Buffer.from(JSON.stringify({demo: true})).toString('base64url');
  await page.fill('#jwtInput', `${header}.${payload}.sig`);
  await page.click('#jwtDecode');
  await expect(page.locator('#statusJwt')).toContainText('未验证');
  await page.screenshot({path: path.join(artifactDir, 'jwt-warning-desktop.png'), fullPage: true});
});

test('regex timeout recovers', async ({page}) => {
  await page.goto('./#regex');
  await page.fill('#regexPattern', '(a+)+$');
  await page.fill('#regexFlags', '');
  await page.fill('#regexText', 'a'.repeat(30) + '!');
  await page.click('#regexRun');
  await expect(page.locator('#statusRegex')).toContainText('3 秒', {timeout: 8000});
  await page.fill('#regexPattern', 'world');
  await page.fill('#regexText', 'hello world');
  await page.click('#regexRun');
  await expect(page.locator('#statusRegex')).toContainText('完成', {timeout: 5000});
});

test('mobile layout jwt', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile project only');
  await page.goto('./#jwt');
  await page.screenshot({path: path.join(artifactDir, 'jwt-warning-mobile.png'), fullPage: true});
});

test('direct GET and reload on hash tool', async ({page}) => {
  await page.goto('./#cron');
  await page.reload();
  await expect(page.locator('#panelCron')).toBeVisible();
  await page.screenshot({path: path.join(artifactDir, 'cron-desktop.png'), fullPage: true});
});

test('JSON compare still works', async ({page}) => {
  await page.goto('./#compare');
  await page.fill('#a', '{"x":1}');
  await page.fill('#b', '{"x":2}');
  await page.click('#run');
  await expect(page.locator('#status')).toContainText('完成', {timeout: 15000});
});