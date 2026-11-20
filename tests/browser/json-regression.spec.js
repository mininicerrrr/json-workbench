import {test, expect} from '@playwright/test';

test('formatter validation redaction and TypeScript', async ({page}) => {
  await page.goto('./#utilities');
  await page.fill('#a', '{"bad":');
  await page.click('#run');
  await expect(page.locator('#status')).toContainText(/语法|JSON/, {timeout: 15000});

  await page.fill('#a', '{"z":1,"a":2}');
  await page.locator('button[data-action="format"]').click();
  await expect(page.locator('#status')).toContainText('完成', {timeout: 15000});
  await expect(page.locator('#output')).toHaveValue(/"a"/, {timeout: 15000});

  await page.goto('./#redact');
  await expect(page.locator('html')).toHaveAttribute('data-active-tool', 'redact');
  const redactSample = '{"user":{"email":"secret@test"}}';
  await page.locator('#a').click();
  await page.locator('#a').fill(redactSample);
  await expect(page.locator('#a')).toHaveValue(redactSample);
  await page.fill('#paths', '/user/email');
  await page.click('#run');
  await expect(page.locator('#output')).toHaveValue(/\[REDACTED\]/, {timeout: 15000});
  await expect(page.locator('#a')).toHaveValue(/secret@test/);

  await page.goto('./#types');
  await page.fill('#a', '{"id":1,"name":"x"}');
  await page.click('#run');
  await expect(page.locator('#output')).toHaveValue(/ApiResponse/);
  await expect(page.locator('#output')).toHaveValue(/string/);
});