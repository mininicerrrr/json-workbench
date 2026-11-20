import test from 'node:test';
import assert from 'node:assert/strict';
import {digestText, uuidV4, validateUuid} from '../src/hash.js';

test('SHA-256 known vector', async () => {
  const h = await digestText('SHA-256', 'abc');
  assert.equal(h, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('UUID v4 format', () => {
  const u = uuidV4();
  assert.equal(validateUuid(u), u);
  assert.throws(() => validateUuid('not-a-uuid'));
});