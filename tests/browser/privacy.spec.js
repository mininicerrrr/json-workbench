import {test, expect} from '@playwright/test';
import {assertUrlHostOnly} from './helpers.js';

const SENSITIVE = 'SYNTH-SECRET-PAYLOAD-9f3c';
const SENSITIVE_B64 = Buffer.from(SENSITIVE).toString('base64');

const JWT = (() => {
  const h = Buffer.from(JSON.stringify({alg: 'none'})).toString('base64url');
  const p = Buffer.from(JSON.stringify({sub: 'demo', secret: SENSITIVE})).toString('base64url');
  return `${h}.${p}.not-verified`;
})();

const STATIC_ASSET = /^\/json-workbench\/(index\.html|robots\.txt|THIRD_PARTY_NOTICES\.txt|personal-assets\/[A-Za-z0-9._-]+\.png|assets\/[A-Za-z0-9._-]+\.(js|css))$/;

function containsSentinel(s = '') {
  const raw = s.includes(SENSITIVE) || s.includes(SENSITIVE_B64);
  try {
    return raw || decodeURIComponent(s).includes(SENSITIVE);
  } catch {
    return raw;
  }
}

function auditRequest(req) {
  const url = req.url();
  if (url.startsWith('data:') || url.startsWith('blob:')) return [];
  const reasons = [];
  const u = new URL(url);
  if (!['127.0.0.1', 'localhost'].includes(u.hostname)) reasons.push(`off-origin ${url}`);
  const method = req.method();
  if (method !== 'GET') reasons.push(`${method} ${url}`);
  if (u.search && u.search.length > 0) reasons.push(`query ${url}`);
  if (!STATIC_ASSET.test(u.pathname) && u.pathname !== '/json-workbench/' && u.pathname !== '/json-workbench') {
    reasons.push(`path ${u.pathname}`);
  }
  if (containsSentinel(u.pathname) || containsSentinel(u.search) || containsSentinel(u.hash)) {
    reasons.push(`sentinel-in-url ${url}`);
  }
  const body = req.postData();
  if (body) reasons.push(`body ${method} ${url}`);
  if (body && containsSentinel(body)) reasons.push(`sentinel-in-body`);
  const ws = req.resourceType() === 'websocket';
  if (ws) reasons.push(`websocket ${url}`);
  if (containsSentinel(JSON.stringify(req.headers()))) reasons.push('sentinel-in-headers');
  return reasons;
}

test('synthetic secrets: strict asset GET allowlist, clipboard copy, address-bar share only', async ({page, context}) => {
  const violations = [];
  page.on('request', req => {
    for (const r of auditRequest(req)) violations.push(r);
  });

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('./#jwt');
  await expect(page.locator('#panelJwt')).toBeVisible();
  await page.fill('#jwtInput', JWT);
  await page.click('#jwtDecode');
  await expect(page.locator('#outputJwt')).toHaveValue(new RegExp(SENSITIVE));
  assertUrlHostOnly(page.url());

  await page.goto('./#compare');
  await page.fill('#a', JSON.stringify({secret: SENSITIVE}));
  await page.fill('#b', JSON.stringify({secret: SENSITIVE, x: 1}));
  await page.click('#run');
  await expect(page.locator('#status')).toContainText('完成', {timeout: 15000});

  await page.goto('./#regex');
  await page.fill('#regexText', SENSITIVE);
  await page.fill('#regexPattern', 'SYNTH-SECRET');
  await page.click('#regexRun');
  await expect(page.locator('#statusRegex')).toContainText(/完成|匹配/, {timeout: 8000});

  const share = await page.evaluate(() => ({
    href: location.href,
    pathname: location.pathname,
    hash: location.hash,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
  }));
  expect(share.hash).toBe('#regex');
  expect(share.pathname).toMatch(/\/json-workbench\/?$/);
  expect(share.href).not.toContain(SENSITIVE);
  expect(share.canonical).not.toContain(SENSITIVE);

  await page.goto('./#redact');
  await page.locator('#a').fill(JSON.stringify({token: SENSITIVE}));
  await page.fill('#paths', '/token');
  await page.click('#run');
  await expect(page.locator('#output')).toHaveValue(/\[REDACTED\]/, {timeout: 15000});
  await page.click('#copy');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('[REDACTED]');
  expect(clip).not.toContain(SENSITIVE);

  expect(violations, violations.join('\n')).toEqual([]);
});