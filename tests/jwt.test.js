import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeJwt} from '../src/jwt.js';

const demoHeader = btoa(JSON.stringify({alg: 'none', typ: 'JWT'})).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const demoPayload = btoa(JSON.stringify({sub: 'user', iat: 0})).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const demo = `${demoHeader}.${demoPayload}.fake-sig`;

test('decodes synthetic JWT and warns', () => {
  const r = decodeJwt(demo);
  assert.equal(r.payload.sub, 'user');
  assert.match(r.warnings.join(' '), /未验证签名/);
});

test('rejects malformed JWT', () => {
  assert.throws(() => decodeJwt('a.b'), /三段/);
  assert.throws(() => decodeJwt('a.!!!.c'), /Base64URL/);
});