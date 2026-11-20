const MAX_INPUT = 1024 * 1024;

export function listTimeZones() {
  if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone').slice().sort();
  }
  return ['UTC', 'Asia/Shanghai', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
}

function assertSize(text) {
  if (new TextEncoder().encode(text).length > MAX_INPUT) throw new Error('输入不得超过 1 MiB。');
}

export function fromEpoch(text, unit, displayZone = 'Asia/Shanghai') {
  assertSize(text);
  if (!/^[+-]?\d+$/.test(text.trim())) throw new Error('请输入整数时间戳，不含小数或其他字符。');
  const n = Number(text);
  if (!Number.isSafeInteger(n)) throw new Error('时间戳超出安全整数范围。');
  const ms = unit === 's' ? n * 1000 : n;
  if (unit === 's' && Math.abs(n) > 8.64e15) throw new Error('秒时间戳过大，可能溢出。');
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) throw new Error('时间戳超出可转换的日期范围。');
  let zoned;
  try {
    zoned = new Intl.DateTimeFormat('sv-SE', {
      timeZone: displayZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).format(d) + `.${String(d.getUTCMilliseconds()).padStart(3, '0')}`;
  } catch {
    throw new Error(`无效 IANA 时区：${displayZone}`);
  }
  const offset = formatOffset(d, displayZone);
  return [
    `本地显示时区：${displayZone}（${offset}）`,
    zoned,
    '',
    'UTC',
    d.toISOString(),
    '',
    '秒时间戳',
    String(Math.floor(ms / 1000)),
    '',
    '毫秒时间戳',
    String(ms),
  ].join('\n');
}

function formatOffset(date, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, timeZoneName: 'shortOffset', hour: 'numeric',
    }).formatToParts(date);
    const p = parts.find(x => x.type === 'timeZoneName');
    return p?.value ?? 'offset unknown';
  } catch {
    return 'offset unknown';
  }
}

export function localToEpoch(text, sourceZone, unit = 'ms') {
  assertSize(text);
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(text);
  if (!m) throw new Error('请选择完整日期与时间。');
  const [year, month, day, hour, min, sec] = m.slice(1, 7).map(v => Number(v || 0));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > days || hour > 23 || min > 59 || sec > 59) {
    throw new Error('日期或时间无效。');
  }
  const millis = (m[7] || '').padEnd(3, '0');
  const stamp = zonedLocalToUtcMs(year, month, day, hour, min, sec, Number(millis), sourceZone);
  if (!Number.isFinite(stamp)) throw new Error('日期超出范围或时区无效。');
  const lines = ['UTC', new Date(stamp).toISOString(), '', '毫秒时间戳', String(stamp), '', '秒时间戳', String(Math.floor(stamp / 1000))];
  if (unit === 's') return lines.join('\n');
  return lines.join('\n');
}

/** Map wall-clock in `timeZone` to UTC ms via binary search (DST-safe). */
function zonedLocalToUtcMs(y, mo, d, h, mi, s, ms, timeZone) {
  const probe = new Date(Date.UTC(y, mo - 1, d, h, mi, s, ms));
  const target = `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  let lo = probe.getTime() - 48 * 3600 * 1000;
  let hi = probe.getTime() + 48 * 3600 * 1000;
  for (let i = 0; i < 40; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const wall = fmt.format(new Date(mid)) + `.${String(new Date(mid).getUTCMilliseconds()).padStart(3, '0')}`;
    if (wall < target) lo = mid + 1;
    else hi = mid;
  }
  const candidate = hi;
  const wall = fmt.format(new Date(candidate)) + `.${String(new Date(candidate).getUTCMilliseconds()).padStart(3, '0')}`;
  if (wall !== target) throw new Error('该本地时间在所选时区不存在（如夏令时跳过时段）或无法唯一解析。');
  return candidate;
}