import test from 'node:test';
import assert from 'node:assert/strict';
import {runRegex} from '../src/regex-engine.js';

test('regex matches and caps', () => {
  const out = runRegex({pattern: '\\d+', flags: 'g', text: 'a1b22c333', global: true});
  assert.match(out, /匹配数：3/);
});

test('invalid pattern', () => {
  assert.throws(() => runRegex({pattern: '[', flags: '', text: 'x', global: false}), /无效正则/);
});