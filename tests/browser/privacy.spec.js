import {test, expect} from '@playwright/test';
import {assertUrlHostOnly} from './helpers.js';

const SENSITIVE = 'SYNTH-SECRET-PAYLOAD-9f3c';
const JWT = (() => {
  const h = Buffer.from(JSON.stringify({alg: 'none'})).toString('base64url');
  const p = Buffer.from(JSON.stringify({sub: 'demo', secret: SENSITIVE})).toString('base64url');
  return `${h}.${p}.not-verified`;
})();

function isAllowedRequest(url) {
  const u = new URL(url);
  if (!['127.0.0.1', 'localhost'].includes(u.hostname)) return false;
  if (!u.pathname.startsWith('/json-workbench/')) return false;
  if (u.search.includes(SENSITIVE) || u.pathname.includes(SENSITIVE)) return false;
  return true;
}

test('synthetic secrets never appear in URL, share hash, or outbound hosts', async ({page, context}) => {
  const blocked = [];
  page.on('request', req => {
    const url = req.url();
    if (url.startsWith('data:') || url.startsWith('blob:')) return;
    if (!isAllowedRequest(url)) blocked.push(url);
  });

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('./#jwt');
  await expect(page.locator('#panelJwt')).toBeVisible();
  await page.fill('#jwtInput', JWT);
  await page.click('#jwtDecode');
  await expect(page.locator('#statusJwt')).toContainText('已解码', {timeout: 10000});
  await expect(page.locator('#outputJwt')).toHaveValue(new RegExp(SENSITIVE));
  assertUrlHostOnly(page.url());
  expect(page.url()).not.toContain(SENSITIVE);

  await page.goto('./#compare');
  await page.fill('#a', JSON.stringify({secret: SENSITIVE}));
  await page.fill('#b', JSON.stringify({secret: SENSITIVE, x: 1}));
  await page.click('#run');
  await expect(page.locator('#status')).toContainText('完成', {timeout: 15000});
  assertUrlHostOnly(page.url());

  await page.goto('./#regex');
  await page.fill('#regexText', SENSITIVE);
  await page.fill('#regexPattern', 'SECRET');
  await page.fill('#regexFlags', '');
  await page.click('#regexRun');
  await expect(page.locator('#statusRegex')).toContainText(/完成|匹配/, {timeout: 8000});
  assertUrlHostOnly(page.url());

  const share = await page.evaluate(() => location.origin + location.pathname + location.hash);
  expect(share).not.toContain(SENSITIVE);
  expect(share).toMatch(/#regex$/);

  await page.goto('./#redact');
  await page.fill('#a', JSON.stringify({token: SENSITIVE}));
  await page.fill('#paths', '/token');
  await page.click('#run');
  await expect(page.locator('#status')).toContainText(/完成|脱敏/, {timeout: 15000});
  await page.click('#copy');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('[REDACTED]');
  expect(clip).not.toContain(SENSITIVE);

  expect(blocked, `unexpected outbound: ${blocked.join(', ')}`).toEqual([]);
});