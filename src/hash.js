const MAX_INPUT = 1024 * 1024;
const enc = new TextEncoder();

export async function digestText(algorithm, text) {
  if (new TextEncoder().encode(text).length > MAX_INPUT) throw new Error('输入不得超过 1 MiB。');
  const data = enc.encode(text);
  const buf = await crypto.subtle.digest(algorithm, data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function uuidV4() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUuid(text) {
  const t = text.trim();
  if (!t) throw new Error('请输入 UUID。');
  if (!UUID_RE.test(t)) throw new Error('不是有效的 UUID 格式（RFC 4122 变体位校验）。');
  return t.toLowerCase();
}