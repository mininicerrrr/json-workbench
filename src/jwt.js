const MAX_JWT_LEN = 64 * 1024;

function decodeBase64Url(segment, label) {
  const s = segment.trim();
  if (!s) throw new Error(`${label} 为空。`);
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  let binary;
  try {
    binary = typeof atob === 'function'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('binary');
  } catch {
    throw new Error(`${label} Base64URL 无效。`);
  }
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  try {
    return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  } catch {
    throw new Error(`${label} 不是有效 UTF-8 JSON 文本。`);
  }
}

function parseJsonPart(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} 不是合法 JSON。`);
  }
}

/**
 * Decode JWT only — never verifies signature or trustworthiness.
 */
export function decodeJwt(token) {
  if (typeof token !== 'string') throw new Error('请输入 JWT 字符串。');
  const t = token.trim();
  if (!t) throw new Error('请输入 JWT 字符串。');
  if (new TextEncoder().encode(t).length > MAX_JWT_LEN) throw new Error('JWT 超过 64 KiB 上限。');
  const parts = t.split('.');
  if (parts.length !== 3) throw new Error('JWT 须为 header.payload.signature 三段。');
  const [hRaw, pRaw, sRaw] = parts;
  if (!hRaw || !pRaw || !sRaw) throw new Error('JWT 某段为空。');
  const headerText = decodeBase64Url(hRaw, 'Header');
  const payloadText = decodeBase64Url(pRaw, 'Payload');
  const header = parseJsonPart(headerText, 'Header');
  const payload = parseJsonPart(payloadText, 'Payload');
  return {
    header,
    payload,
    signatureSegment: sRaw,
    headerJson: JSON.stringify(header, null, 2),
    payloadJson: JSON.stringify(payload, null, 2),
    warnings: [
      '未验证签名：任何人都可以伪造 payload。',
      '解码结果不可信，不能用于身份认证或授权决策。',
      '请在受信环境中使用正式 JWT 库完成验签。',
    ],
  };
}