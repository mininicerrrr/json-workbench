import {test, expect} from '@playwright/test';

test('UTC once: exact epoch conversion', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop precision');
  await page.goto('./#timestamp');
  await expect(page.locator('#tsDisplayZone option[value="UTC"]')).toHaveCount(1);
  await page.selectOption('#tsDisplayZone', 'UTC');
  expect(await page.locator('#tsDisplayZone').inputValue()).toBe('UTC');
  await page.fill('#tsInput', '0');
  await page.selectOption('#tsUnit', 's');
  await page.click('#tsFromEpoch');
  const out = await page.locator('#outputTimestamp').inputValue();
  expect(out).toContain('1970-01-01 00:00:00.000');
  expect(out).toContain('1970-01-01T00:00:00.000Z');
  expect(out).toMatch(/秒时间戳\n0/);
  expect(out).toMatch(/毫秒时间戳\n0$/);
});

test('UTC once: cron next run at fixed clock', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop precision');
  await page.clock.install({time: new Date('2023-12-31T23:00:00Z')});
  await page.goto('./#cron');
  await expect(page.locator('#cronWindowNote')).toContainText('366');
  await expect(page.locator('#cronZone option[value="UTC"]')).toHaveCount(1);
  await page.selectOption('#cronZone', 'UTC');
  await page.fill('#cronExpr', '0 0 1 1 *');
  await page.fill('#cronCount', '1');
  await page.click('#cronRun');
  await expect(page.locator('#statusCron')).toContainText('已生成', {timeout: 20000});
  await expect(page.locator('#outputCron')).toHaveValue(/1\. 2024-01-01 00:00:00 \(UTC\)/);
  await expect(page.locator('#outputCron')).toHaveValue(new RegExp(`${366}.*日历日`));
});

test('cron no-results error mentions window without blocking cancel', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop: slow worker path');
  test.setTimeout(120000);
  await page.goto('./#cron');
  await page.selectOption('#cronZone', 'UTC');
  await page.fill('#cronExpr', '0 0 29 2 *');
  await page.fill('#cronCount', '5');
  await page.click('#cronRun');
  await page.fill('#cronExpr', 'typing-during-search');
  await expect(page.locator('#cronExpr')).toHaveValue('typing-during-search');
  await page.click('#cronCancel');
  await expect(page.locator('#statusCron')).toContainText('取消');
  await page.fill('#cronExpr', '0 0 29 2 *');
  await page.fill('#cronCount', '5');
  await page.click('#cronRun');
  await expect(page.locator('#statusCron')).toContainText('这不表示表达式永不运行', {timeout: 90000});
});