export const MAX_REGEX_INPUT = 256 * 1024;
export const MAX_MATCHES = 500;
export const MAX_MATCH_LEN = 2000;

export function runRegex({pattern, flags, text, global}) {
  if (new TextEncoder().encode(text).length > MAX_REGEX_INPUT) throw new Error('文本超过 256 KiB 上限。');
  if (new TextEncoder().encode(pattern).length > 1024) throw new Error('正则可读部分超过 1 KiB。');
  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    throw new Error(`无效正则：${e.message}`);
  }
  const lines = [`模式 /${pattern}/${flags}`, `标志：${flags || '(无)'}`];
  if (re.flags.includes('d') === false && global) {
    /* global from UI */
  }
  const matches = [];
  if (global || flags.includes('g')) {
    const g = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
    let m;
    while ((m = g.exec(text)) !== null) {
      if (matches.length >= MAX_MATCHES) {
        lines.push('', `达到 ${MAX_MATCHES} 条匹配上限，结果不完整。`);
        break;
      }
      const slice = m[0].length > MAX_MATCH_LEN ? m[0].slice(0, MAX_MATCH_LEN) + '…' : m[0];
      matches.push({index: m.index, groups: m.slice(1), text: slice});
      if (m[0].length === 0) g.lastIndex++;
    }
  } else {
    const m = re.exec(text);
    if (m) {
      const slice = m[0].length > MAX_MATCH_LEN ? m[0].slice(0, MAX_MATCH_LEN) + '…' : m[0];
      matches.push({index: m.index, groups: m.slice(1), text: slice});
    }
  }
  lines.push('', `匹配数：${matches.length}`);
  for (const [i, m] of matches.entries()) {
    lines.push(`#${i + 1} @${m.index}: ${JSON.stringify(m.text)}`);
    if (m.groups.length) lines.push(`  捕获组：${m.groups.map(g => JSON.stringify(g)).join(', ')}`);
  }
  if (!matches.length) lines.push('（无匹配）');
  if (matches.length) {
    lines.push('', '首个匹配上下文：', text.slice(Math.max(0, matches[0].index - 40), matches[0].index + matches[0].text.length + 40));
  }
  return lines.join('\n');
}