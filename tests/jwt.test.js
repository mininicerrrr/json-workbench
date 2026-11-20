import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeJwt} from '../src/jwt.js';

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

const demo = `${b64url({alg: 'none', typ: 'JWT'})}.${b64url({sub: 'user', iat: 0, note: '合成测试'})}.fake-sig`;

test('decodes synthetic JWT and warns', () => {
  const r = decodeJwt(demo);
  assert.equal(r.payload.sub, 'user');
  assert.match(r.warnings.join(' '), /未验证签名/);
});

test('rejects malformed JWT', () => {
  assert.throws(() => decodeJwt('a.b'), /三段/);
  assert.throws(() => decodeJwt('a.!!!.c'), /Base64URL/);
});

test('rejects non-UTF8 payload bytes', () => {
  const badPayload = Buffer.from([0xff, 0xfe, 0xfd]).toString('base64url');
  assert.throws(() => decodeJwt(`e30.${badPayload}.sig`), /UTF-8/);
});

test('size limit 64KiB', () => {
  const huge = 'a.' + 'A'.repeat(64 * 1024) + '.c';
  assert.throws(() => decodeJwt(huge), /64 KiB/);
});

test('rejects invalid JSON in payload', () => {
  const notJson = Buffer.from('{not-json').toString('base64url');
  assert.throws(() => decodeJwt(`e30.${notJson}.sig`), /合法 JSON/);
});