import {test, expect} from '@playwright/test';

test('timeout terminates Worker generation and UI stays interactive; cancel works', async ({page}) => {
  await page.goto('./#regex');
  const gen0 = await page.locator('html').getAttribute('data-regex-worker-generation');

  await page.fill('#regexPattern', '(a+)+$');
  await page.fill('#regexFlags', '');
  await page.fill('#regexText', 'a'.repeat(28) + '!');
  await page.click('#regexRun');

  await expect.poll(async () => page.locator('html').getAttribute('data-regex-worker-phase')).toBe('running');
  const genRunning = await page.locator('html').getAttribute('data-regex-worker-generation');
  expect(Number(genRunning)).toBeGreaterThan(Number(gen0 || 0));

  await page.fill('#regexPattern', 'edited-while-running');
  await expect(page.locator('#regexPattern')).toHaveValue('edited-while-running');

  await expect(page.locator('#statusRegex')).toContainText('3 秒', {timeout: 8000});
  await expect(page.locator('html')).toHaveAttribute('data-regex-worker-phase', 'terminated');

  await page.fill('#regexPattern', 'world');
  await page.fill('#regexText', 'hello world');
  await page.click('#regexRun');
  await expect(page.locator('#statusRegex')).toContainText('完成', {timeout: 5000});
  const genAfter = await page.locator('html').getAttribute('data-regex-worker-generation');
  expect(Number(genAfter)).toBeGreaterThan(Number(genRunning));

  await page.fill('#regexPattern', '(x+)+$');
  await page.fill('#regexText', 'x'.repeat(28) + 'y');
  await page.click('#regexRun');
  await expect(page.locator('html')).toHaveAttribute('data-regex-worker-phase', 'running');
  await page.click('#regexCancel');
  await expect(page.locator('html')).toHaveAttribute('data-regex-worker-phase', 'terminated');
  await expect(page.locator('#statusRegex')).toContainText('已取消');
});