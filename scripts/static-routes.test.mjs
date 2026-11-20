import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const proc = spawn('node', ['scripts/pages-static-server.mjs'], {stdio: 'ignore'});
await delay(400);

try {
  const port = process.env.STATIC_PORT || '5299';
  const base = `http://127.0.0.1:${port}/json-workbench/`;
  const res = await fetch(base);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /JSON Workbench/);
  const asset = await fetch(`http://127.0.0.1:${port}/json-workbench/robots.txt`);
  assert.equal(asset.status, 200);
  const missing = await fetch(`http://127.0.0.1:${port}/json-workbench/no-spa-fallback`);
  assert.equal(missing.status, 404);
  console.log('static-routes: ok (Pages base /json-workbench/, no SPA fallback)');
} finally {
  proc.kill('SIGTERM');
}