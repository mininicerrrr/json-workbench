import {test, expect} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const workerInit = path.join(path.dirname(fileURLToPath(import.meta.url)), 'worker-init.js');

test('native Worker terminate on timeout/cancel; new Worker on recovery', async ({page}) => {
  await page.addInitScript({path: workerInit});
  await page.goto('./#regex');

  const ops0 = await page.evaluate(() => ({...window.__workerOps}));

  await page.fill('#regexPattern', '(a+)+$');
  await page.fill('#regexFlags', '');
  await page.fill('#regexText', 'a'.repeat(28) + '!');
  await page.click('#regexRun');

  await expect.poll(async () => page.evaluate(() => window.__workerOps.construct)).toBeGreaterThan(ops0.construct);
  await page.fill('#regexPattern', 'edited-while-running');
  await expect(page.locator('#regexPattern')).toHaveValue('edited-while-running');

  await expect(page.locator('#statusRegex')).toContainText('3 秒', {timeout: 8000});
  const afterTimeout = await page.evaluate(() => ({...window.__workerOps}));
  expect(afterTimeout.terminate).toBeGreaterThan(ops0.terminate);
  await expect(page.locator('html')).toHaveAttribute('data-regex-worker-phase', 'terminated');

  await page.fill('#regexPattern', 'world');
  await page.fill('#regexText', 'hello world');
  await page.click('#regexRun');
  await expect(page.locator('#statusRegex')).toContainText('完成', {timeout: 5000});
  const afterRecovery = await page.evaluate(() => ({...window.__workerOps}));
  expect(afterRecovery.construct).toBeGreaterThan(afterTimeout.construct);

  await page.fill('#regexPattern', '(x+)+$');
  await page.fill('#regexText', 'x'.repeat(28) + 'y');
  const beforeCancel = await page.evaluate(() => ({...window.__workerOps}));
  await page.click('#regexRun');
  await expect(page.locator('html')).toHaveAttribute('data-regex-worker-phase', 'running');
  await page.click('#regexCancel');
  const afterCancel = await page.evaluate(() => ({...window.__workerOps}));
  expect(afterCancel.terminate).toBeGreaterThan(beforeCancel.terminate);
});