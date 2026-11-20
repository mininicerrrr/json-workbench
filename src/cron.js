const MAX_CRON_LEN = 256;
const MAX_PREVIEW = 20;
export const CRON_SEARCH_DAYS = 366;

const FIELD_NAMES = ['minute', 'hour', 'day-of-month', 'month', 'day-of-week'];

export const CRON_SEMANTICS = `五字段顺序：分 时 日 月 周（0-59 0-23 1-31 1-12 0-7，周 0/7=周日）。
支持 *、?（仅日/周）、,、-、/ 与数字。不支持名称（MON）与 L/W/#。
日与日/周：若二者均非 * / ?，采用“或”语义——任一字段匹配即可（常见 crontab 约定）。
预览按 IANA 时区墙上时钟匹配，每分钟步进 UTC 时间轴：
· 夏令时「跳时」：不存在的本地时刻不会出现（如 America/New_York 春季 02:30 当日被跳过）。
· 夏令时「折时」：同一本地标签可能在折叠夜出现两次，对应不同 UTC 时刻（各输出一行，local 相同、at 不同）。
下次运行预览从当前时刻起最多搜索 ${CRON_SEARCH_DAYS} 个日历日（按分钟步进）；窗口内找不到足够次数不代表表达式永不运行。`;

function parseField(part, min, max, allowQ) {
  const t = part.trim();
  if (!t) throw new Error('Cron 字段为空。');
  if (allowQ && t === '?') return () => true;
  if (t === '*') return () => true;
  const checks = [];
  for (const piece of t.split(',')) {
  const stepM = /^(.+)\/(\d+)$/.exec(piece);
  const base = stepM ? stepM[1] : piece;
  const step = stepM ? Number(stepM[2]) : 1;
  if (!Number.isInteger(step) || step < 1) throw new Error(`步进无效：${piece}`);
  let lo, hi;
  if (base === '*') { lo = min; hi = max; }
  else if (base.includes('-')) {
    const [a, b] = base.split('-');
    lo = Number(a); hi = Number(b);
    if (!Number.isInteger(lo) || !Number.isInteger(hi)) throw new Error(`范围无效：${piece}`);
  } else {
    lo = hi = Number(base);
    if (!Number.isInteger(lo)) throw new Error(`值无效：${piece}`);
  }
  if (lo < min || hi > max || lo > hi) throw new Error(`越界：${piece}（允许 ${min}-${max}）`);
  for (let v = lo; v <= hi; v += step) checks.push(v);
  }
  const set = new Set(checks);
  return n => set.has(n);
}

function normalizeDow(n) { return n === 7 ? 0 : n; }

export function parseCron(expression) {
  const raw = expression.trim();
  if (!raw) throw new Error('请输入 Cron 表达式。');
  if (new TextEncoder().encode(raw).length > MAX_CRON_LEN) throw new Error('表达式过长。');
  const fields = raw.split(/\s+/);
  if (fields.length !== 5) throw new Error('须为 5 个字段（分 时 日 月 周）。');
  const [min, hour, dom, mon, dow] = fields;
  if (/^31$/.test(dom.trim()) && /^2$/.test(mon.trim())) {
    throw new Error('2 月没有 31 日，表达式不可满足。');
  }
  if (/^30$/.test(dom.trim()) && /^2$/.test(mon.trim())) {
    throw new Error('2 月没有 30 日，表达式不可满足（仅闰年有 29 日）。');
  }
  const matchers = [
    parseField(min, 0, 59, false),
    parseField(hour, 0, 23, false),
    parseField(dom, 1, 31, true),
    parseField(mon, 1, 12, false),
    parseField(dow, 0, 7, true),
  ];
  const domAny = dom === '*' || dom === '?';
  const dowAny = dow === '*' || dow === '?';
  const explain = FIELD_NAMES.map((name, i) => `${name}: ${fields[i]}`).join('\n');
  return {matchers, domAny, dowAny, explain, raw};
}

function partsInZone(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', weekday: 'short', hour12: false,
  });
  const map = {Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6};
  const o = Object.fromEntries(fmt.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return {
    minute: Number(o.minute),
    hour: Number(o.hour),
    day: Number(o.day),
    month: Number(o.month),
    dow: map[o.weekday] ?? 0,
    label: new Intl.DateTimeFormat('sv-SE', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).format(date),
  };
}

function matchesCron(parsed, parts) {
  if (!parsed.matchers[0](parts.minute) || !parsed.matchers[1](parts.hour) || !parsed.matchers[3](parts.month)) {
    return false;
  }
  const domOk = parsed.matchers[2](parts.day);
  const dowOk = parsed.matchers[4](normalizeDow(parts.dow));
  if (parsed.domAny && parsed.dowAny) return true;
  if (parsed.domAny) return dowOk;
  if (parsed.dowAny) return domOk;
  return domOk || dowOk;
}

export function nextRuns(expression, timeZone, count = 5, fromMs = Date.now()) {
  if (count > MAX_PREVIEW) throw new Error(`最多预览 ${MAX_PREVIEW} 次。`);
  let tz;
  try {
    new Intl.DateTimeFormat('en-US', {timeZone}).format(new Date());
    tz = timeZone;
  } catch {
    throw new Error(`无效 IANA 时区：${timeZone}`);
  }
  const parsed = parseCron(expression);
  const out = [];
  let t = Math.floor(fromMs / 60000) * 60000 + 60000;
  const limit = t + CRON_SEARCH_DAYS * 24 * 60 * 60000;
  while (out.length < count && t < limit) {
    const parts = partsInZone(new Date(t), tz);
    if (matchesCron(parsed, parts)) {
      out.push({at: t, local: parts.label, timeZone: tz});
    }
    t += 60000;
  }
  if (out.length < count) {
    throw new Error(
      `在自此刻起最多 ${CRON_SEARCH_DAYS} 天的预览窗口内未找到足够的运行时刻（已找到 ${out.length}/${count} 次）。这不表示表达式永不运行。`,
    );
  }
  return {semantics: CRON_SEMANTICS, explain: parsed.explain, runs: out, searchDays: CRON_SEARCH_DAYS};
}