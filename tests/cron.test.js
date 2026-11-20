import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCron, nextRuns} from '../src/cron.js';

test('parses five-field cron', () => {
  const p = parseCron('0 9 * * 1-5');
  assert.match(p.explain, /minute: 0/);
});

test('rejects bad cron', () => {
  assert.throws(() => parseCron('0 9 *'), /5 个字段/);
  assert.throws(() => parseCron('99 9 * * *'), /越界/);
});

test('next runs in timezone', () => {
  const r = nextRuns('0 0 * * *', 'UTC', 3, Date.parse('2024-01-01T00:00:00Z'));
  assert.equal(r.runs.length, 3);
  assert.ok(r.runs[0].local.startsWith('2024-01-02'));
});

test('DOM/DOW OR semantics', () => {
  const p = parseCron('0 0 15 * 1');
  assert.equal(p.domAny, false);
  assert.equal(p.dowAny, false);
});