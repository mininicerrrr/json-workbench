import {test, expect} from '@playwright/test';

test('cron sparse search keeps UI responsive; cancel then valid run', async ({page}) => {
  test.setTimeout(120000);
  await page.goto('./#cron');
  await page.fill('#cronExpr', '0 0 29 2 *');
  await page.fill('#cronCount', '5');
  await page.click('#cronRun');
  await expect(page.locator('html')).toHaveAttribute('data-cron-worker-phase', 'running');
  await expect(page.locator('#statusCron')).toContainText('Worker');

  await page.fill('#cronExpr', 'edited-while-searching');
  await expect(page.locator('#cronExpr')).toHaveValue('edited-while-searching');

  await page.click('#cronCancel');
  await expect(page.locator('html')).toHaveAttribute('data-cron-worker-phase', 'terminated');
  await expect(page.locator('#statusCron')).toContainText('取消');

  await page.fill('#cronExpr', '0 0 * * *');
  await page.fill('#cronCount', '2');
  await page.click('#cronRun');
  await expect(page.locator('#statusCron')).toContainText('已生成', {timeout: 15000});
});