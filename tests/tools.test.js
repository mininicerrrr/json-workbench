import test from 'node:test';
import assert from 'node:assert/strict';
import {toolsForSearch, TOOL_MAP} from '../src/tools-registry.js';

test('registry has stable tool ids', () => {
  for (const id of ['compare', 'jwt', 'regex', 'cron', 'hash', 'timestamp']) {
    assert.ok(TOOL_MAP[id]);
  }
});

test('search finds jwt', () => {
  assert.ok(toolsForSearch('jwt').some(t => t.id === 'jwt'));
});