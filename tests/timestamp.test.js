import test from 'node:test';
import assert from 'node:assert/strict';
import {fromEpoch, localToEpoch, listTimeZones} from '../src/timestamp.js';

test('epoch with IANA zone', () => {
  assert.match(fromEpoch('0', 's', 'UTC'), /1970-01-01/);
  assert.throws(() => fromEpoch('1.5', 's'), /整数/);
});

test('local to epoch Shanghai vs UTC', () => {
  const a = localToEpoch('2024-01-01T08:00', 'Asia/Shanghai');
  const b = localToEpoch('2024-01-01T00:00', 'UTC');
  assert.equal(a, b);
});

test('invalid calendar date rejected', () => {
  assert.throws(() => localToEpoch('2023-02-29T12:00', 'UTC'));
});

test('second timestamp overflow guard', () => {
  assert.throws(() => fromEpoch('99999999999999999', 's'), /过大|范围|安全/);
});

test('DST spring-forward gap in New York is rejected', () => {
  assert.throws(
    () => localToEpoch('2024-03-10T02:30', 'America/New_York'),
    /不存在|无法/,
  );
});

test('millisecond vs second output units', () => {
  assert.match(fromEpoch('1000', 'ms', 'UTC'), /秒时间戳\n1\n/);
});

test('listTimeZones always includes UTC once', () => {
  const z = listTimeZones();
  assert.equal(z.filter(x => x === 'UTC').length, 1);
  assert.match(fromEpoch('0', 's', 'UTC'), /UTC/);
});