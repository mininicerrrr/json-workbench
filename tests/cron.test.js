import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCron, nextRuns} from '../src/cron.js';

const fromUtc = (iso) => Date.parse(iso);

test('parses five-field cron', () => {
  const p = parseCron('0 9 * * 1-5');
  assert.match(p.explain, /minute: 0/);
});

test('rejects bad cron', () => {
  assert.throws(() => parseCron('0 9 *'), /5 个字段/);
  assert.throws(() => parseCron('99 9 * * *'), /越界/);
});

test('daily wildcard produces consecutive UTC midnights', () => {
  const r = nextRuns('0 0 * * *', 'UTC', 3, fromUtc('2024-01-01T00:00:00Z'));
  assert.deepEqual(r.runs.map(x => x.local.slice(0, 10)), ['2024-01-02', '2024-01-03', '2024-01-04']);
});

test('DOM-only wildcard (? on DOW) — next is day-of-month match', () => {
  const r = nextRuns('0 0 15 * ?', 'UTC', 2, fromUtc('2024-06-10T12:00:00Z'));
  assert.equal(r.runs[0].local, '2024-06-15 00:00:00');
  assert.equal(r.runs[1].local, '2024-07-15 00:00:00');
});

test('DOW-only wildcard (? on DOM) — Mondays in UTC', () => {
  const r = nextRuns('0 0 ? * 1', 'UTC', 3, fromUtc('2024-06-10T12:00:00Z')); // Mon
  assert.deepEqual(r.runs.map(x => x.local.slice(0, 10)), ['2024-06-17', '2024-06-24', '2024-07-01']);
});

test('DOM/DOW OR — 15th or Monday includes Saturday 15th before Monday', () => {
  const r = nextRuns('0 0 15 * 1', 'UTC', 2, fromUtc('2024-06-10T12:00:00Z'));
  assert.equal(r.runs[0].local, '2024-06-15 00:00:00'); // Sat 15th
  assert.equal(r.runs[1].local, '2024-06-17 00:00:00'); // Mon
});

test('DOM/DOW OR — Monday also matches when not the 15th', () => {
  const r = nextRuns('0 0 15 * 1', 'UTC', 1, fromUtc('2024-06-16T01:00:00Z')); // Sun after 15th
  assert.equal(r.runs[0].local, '2024-06-17 00:00:00');
});

test('Asia/Shanghai local labels for 09:00 job', () => {
  const r = nextRuns('0 9 * * *', 'Asia/Shanghai', 1, fromUtc('2024-01-01T00:00:00Z'));
  assert.match(r.runs[0].local, /^2024-01-01 09:00:00$/);
});

test('America/New_York across DST spring — runs remain ordered local midnights', () => {
  const r = nextRuns('0 0 * * *', 'America/New_York', 5, fromUtc('2024-03-08T05:00:00Z'));
  const days = r.runs.map(x => x.local.slice(0, 10));
  assert.ok(days.includes('2024-03-09'));
  assert.ok(days.includes('2024-03-10'));
  assert.ok(days.includes('2024-03-11'));
});

test('leap day Feb 29 matches in leap year', () => {
  const r = nextRuns('0 0 29 2 *', 'UTC', 1, fromUtc('2023-12-01T00:00:00Z'));
  assert.equal(r.runs[0].local, '2024-02-29 00:00:00');
});

test('year boundary Jan 1', () => {
  const r = nextRuns('0 0 1 1 *', 'UTC', 1, fromUtc('2023-12-31T20:00:00Z'));
  assert.equal(r.runs[0].local, '2024-01-01 00:00:00');
});

test('impossible Feb 31 schedule rejected at parse', () => {
  assert.throws(() => parseCron('0 0 31 2 *'), /不可满足/);
  assert.throws(() => nextRuns('0 0 31 2 *', 'UTC', 1, fromUtc('2024-01-01T00:00:00Z')), /不可满足/);
});

test('documented OR flags for combined DOM/DOW', () => {
  const p = parseCron('0 0 15 * 1');
  assert.equal(p.domAny, false);
  assert.equal(p.dowAny, false);
});