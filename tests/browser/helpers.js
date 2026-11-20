import {expect} from '@playwright/test';
import {TOOLS} from '../../src/tools-registry.js';

export const TOOL_IDS = TOOLS.map(t => t.id);

export const PANEL = {
  home: '#panelHome',
  compare: '#panelJson',
  redact: '#panelJson',
  types: '#panelJson',
  utilities: '#panelJson',
  timestamp: '#panelTimestamp',
  regex: '#panelRegex',
  jwt: '#panelJwt',
  cron: '#panelCron',
  hash: '#panelHash',
};

export async function expectActiveTool(page, id) {
  await expect(page.locator(`html[data-active-tool="${id}"]`)).toBeAttached();
  const panel = page.locator(PANEL[id]);
  await expect(panel).toBeVisible();
}

export function assertUrlHostOnly(url) {
  const u = new URL(url);
  expect(u.pathname).toMatch(/\/json-workbench\/?$/);
  expect(u.search).toBe('');
  expect(u.hash).toMatch(/^#[a-z]+$/);
}