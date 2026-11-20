import {test, expect} from '@playwright/test';
import {TOOL_IDS, PANEL, expectActiveTool} from './helpers.js';

const port = process.env.STATIC_PORT || '5299';
const origin = `http://127.0.0.1:${port}`;

test('static root 200, asset load, missing path 404', async ({request, page}) => {
  const root = await request.get(`${origin}/json-workbench/`);
  expect(root.status()).toBe(200);
  const robots = await request.get(`${origin}/json-workbench/robots.txt`);
  expect(robots.status()).toBe(200);
  const missing = await request.get(`${origin}/json-workbench/no-spa-fallback-route`);
  expect(missing.status()).toBe(404);

  await page.goto('./#compare', {waitUntil: 'load'});
  const script = page.locator('script[src*="/assets/index-"]');
  await expect(script).toHaveCount(1);
  const src = await script.getAttribute('src');
  const asset = await request.get(`${origin}${src}`);
  expect(asset.status()).toBe(200);
});

test('direct open and reload every tool hash', async ({page}) => {
  for (const id of TOOL_IDS) {
    await page.goto(`./#${id}`);
    await expectActiveTool(page, id);
    const workerReq = id === 'compare'
      ? page.waitForResponse(r => /\/assets\/worker-.*\.js$/.test(r.url()), {timeout: 15000})
      : null;
    if (id === 'compare') {
      await page.fill('#a', '{"k":1}');
      await page.fill('#b', '{"k":2}');
      await page.click('#run');
      const wr = await workerReq;
      expect(wr.status()).toBe(200);
      await expect(page.locator('#status')).toContainText('完成', {timeout: 15000});
    }
    if (id === 'cron') {
      await page.fill('#cronExpr', '0 0 * * *');
      await page.fill('#cronCount', '1');
      const workerWait = page.waitForResponse(r => /cron-worker-.*\.js$/.test(r.url()), {timeout: 10000});
      await page.click('#cronRun');
      const wr = await workerWait;
      expect(wr.status()).toBe(200);
      await expect(page.locator('#statusCron')).toContainText(/已生成|Worker|366/, {timeout: 30000});
    }
    if (id === 'regex') {
      await page.fill('#regexPattern', 'a');
      await page.fill('#regexText', 'a');
      const workerWait = page.waitForResponse(r => /regex-worker-.*\.js$/.test(r.url()), {timeout: 10000});
      await page.click('#regexRun');
      const wr = await workerWait;
      expect(wr.status()).toBe(200);
      await expect(page.locator('#statusRegex')).toContainText(/完成|匹配/, {timeout: 8000});
    }
    await page.reload();
    await expectActiveTool(page, id);
    await expect(page.locator(PANEL[id])).toBeVisible();
    const topLink = page.locator(`nav#topNav a[href="#${id}"]`);
    if (await topLink.count()) {
      await expect(topLink).toHaveClass(/active/);
    }
  }
});