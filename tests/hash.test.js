import test from 'node:test';
import assert from 'node:assert/strict';
import {digestText, uuidV4, validateUuid} from '../src/hash.js';

test('SHA-256 known vector', async () => {
  const h = await digestText('SHA-256', 'abc');
  assert.equal(h, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('SHA-384 known vector', async () => {
  const h = await digestText('SHA-384', 'abc');
  assert.equal(
    h,
    'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
  );
});

test('SHA-512 known vector', async () => {
  const h = await digestText('SHA-512', 'abc');
  assert.equal(
    h,
    'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
  );
});

test('UUID v4 format', () => {
  const u = uuidV4();
  assert.equal(validateUuid(u), u);
  assert.throws(() => validateUuid('not-a-uuid'));
});