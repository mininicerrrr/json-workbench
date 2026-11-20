import './style.css';
import {MAX_BYTES} from './engine.js';
import {urlTool, fromTimestamp, toTimestamp} from './utility.js';
import {SUPPORT_IMAGE} from './support-config.js';
import {TOOLS, TOOL_MAP, CATEGORIES, toolsForSearch} from './tools-registry.js';
import {decodeJwt} from './jwt.js';
import {fromEpoch, localToEpoch, listTimeZones} from './timestamp.js';
import {CRON_SEARCH_DAYS} from './cron.js';
import {digestText, uuidV4, validateUuid} from './hash.js';

const $ = id => document.getElementById(id);
const BASE_CANONICAL = 'https://mininicerrrr.github.io/json-workbench/';
const REGEX_TIMEOUT_MS = 3000;

let mode = 'compare';
let worker = null;
let regexWorker = null;
let regexWorkerGeneration = 0;
let cronWorker = null;
let cronActiveId = 0;
let timer = null;
let regexTimer = null;
let nextId = 0;
let activeId = 0;
let regexActiveId = 0;
let lastResult = '';
let resultJSON = false;

const sampleA = {user: {id: '9007199254740993', name: 'Alice', email: 'alice@example.test'}, token: 'demo-only-not-a-real-token', roles: ['reader'], active: true};
const sampleB = {active: true, roles: ['reader', 'editor'], token: 'demo-only-not-a-real-token', user: {email: 'bob@example.test', name: 'Bob', id: '9007199254740993'}, version: 2};

const jsonMeta = {
  compare: ['STEP 01 / COMPARE', '先找到真正的变化', '忽略对象键顺序，数组按索引比较。每条变化都有 JSON Pointer。', '比较差异 →'],
  redact: ['STEP 02 / REDACT', '先预览，再放心交接', '只替换指定精确路径，生成独立副本；原始输入保持不变。', '生成脱敏预览 →'],
  types: ['STEP 03 / TYPES', '把样例变成类型起点', '从当前样例推断，不是完整 API schema。请审阅后再使用。', '生成 TypeScript →'],
  utilities: ['EXTRA / UTILITIES', 'JSON 与 URL', '严格 JSON 格式化与 URL 组件编解码。', '格式化 JSON →'],
};

const JSON_MODES = new Set(['compare', 'redact', 'types', 'utilities']);

function status(s, kind = '') {
  $('status').textContent = s;
  $('status').className = kind;
}

function subStatus(id, s, kind = '') {
  const el = $(id);
  if (!el) return;
  el.textContent = s;
  el.className = 'substatus' + (kind ? ' ' + kind : '');
}

function counts() {
  for (const x of ['a', 'b']) {
    const el = $(x + 'Count');
    if (el) el.textContent = $(x).value.length + ' 字符';
  }
}

function busy(on) {
  $('run').disabled = on;
  $('cancel').hidden = !on;
  document.querySelectorAll('[data-action]').forEach(b => { b.disabled = on; });
}

function stop() {
  if (worker) worker.terminate();
  worker = null;
  clearTimeout(timer);
  activeId = 0;
  busy(false);
}

function stopCron(outcome = 'idle') {
  if (cronWorker) {
    cronWorker.terminate();
    cronWorker = null;
    document.documentElement.dataset.cronWorkerPhase = outcome === 'idle' ? 'idle' : 'terminated';
  } else if (outcome !== 'idle') {
    document.documentElement.dataset.cronWorkerPhase = outcome;
  } else {
    document.documentElement.dataset.cronWorkerPhase = 'idle';
  }
  $('cronRun').disabled = false;
  $('cronCancel').hidden = true;
}

function formatCronOutput(r) {
  return [
    r.semantics,
    '',
    '字段：',
    r.explain,
    '',
    ...r.runs.map((x, i) => `${i + 1}. ${x.local} (${x.timeZone})`),
  ].join('\n');
}

function stopRegex(outcome = 'idle') {
  if (regexWorker) {
    regexWorker.terminate();
    regexWorker = null;
    document.documentElement.dataset.regexWorkerPhase = outcome === 'idle' ? 'idle' : 'terminated';
  } else if (outcome !== 'idle') {
    document.documentElement.dataset.regexWorkerPhase = outcome;
  } else {
    document.documentElement.dataset.regexWorkerPhase = 'idle';
  }
  clearTimeout(regexTimer);
  regexActiveId = 0;
  $('regexRun').disabled = false;
  $('regexCancel').hidden = true;
}

function output(text, isJSON = false) {
  lastResult = text;
  resultJSON = isJSON;
  $('output').value = text;
  $('useResult').disabled = !isJSON;
  $('copy').disabled = !text;
  $('download').disabled = !text;
}

function resetResult() {
  output('');
  $('diffResults').replaceChildren();
}

function applySeo(toolId) {
  const tool = TOOL_MAP[toolId] ?? TOOL_MAP.home;
  $('docTitle').textContent = tool.title;
  $('metaDescription').setAttribute('content', tool.description);
  const link = $('canonical');
  link.setAttribute('href', BASE_CANONICAL + (toolId === 'home' ? '' : '#' + toolId));
}

function panelFor(modeId) {
  if (modeId === 'home') return 'panelHome';
  if (JSON_MODES.has(modeId)) return 'panelJson';
  return 'panel' + modeId.charAt(0).toUpperCase() + modeId.slice(1);
}

function route() {
  const raw = location.hash.slice(1);
  const resolved = raw && TOOL_MAP[raw] ? raw : 'compare';
  if (resolved !== mode) {
    stop();
    stopRegex();
    stopCron();
    resetResult();
  }
  mode = resolved;
  document.documentElement.dataset.activeTool = mode;
  applySeo(mode);
  document.querySelectorAll('.tool-panel, #panelJson').forEach(p => { p.hidden = true; });
  const panel = $(panelFor(mode));
  if (panel) panel.hidden = false;
  $('guideSection').hidden = mode !== 'compare' && mode !== 'redact' && mode !== 'types';
  if (JSON_MODES.has(mode)) {
    const [step, title, description, run] = jsonMeta[mode];
    $('step').textContent = step;
    $('title').textContent = title;
    $('description').textContent = description;
    $('run').textContent = run;
    $('rightEditor').hidden = mode !== 'compare';
    document.querySelector('.editors').classList.toggle('single', mode !== 'compare');
    $('pathArea').hidden = mode !== 'redact';
    $('utilities').hidden = mode !== 'utilities';
    $('redactWarning').hidden = mode !== 'redact';
    $('resultTitle').textContent = '处理结果';
    status('准备就绪。内容不上传、不写入 URL 或浏览器存储。');
  } else if (mode === 'home') {
    renderHome();
  }
  document.querySelectorAll('#topNav a').forEach(a => a.classList.toggle('active', a.hash === '#' + mode));
  document.querySelectorAll('#discoverList a').forEach(a => a.classList.toggle('active', a.hash === '#' + mode));
}

function renderNav() {
  const nav = $('topNav');
  nav.replaceChildren();
  for (const t of TOOLS.filter(x => x.nav)) {
    const a = document.createElement('a');
    a.href = '#' + t.id;
    a.innerHTML = `${t.label} <strong>${t.category}</strong>`;
    nav.append(a);
  }
}

function renderDiscoverList(filter = '') {
  const list = $('discoverList');
  list.replaceChildren();
  const items = toolsForSearch(filter);
  for (const t of items) {
    const a = document.createElement('a');
    a.href = '#' + t.id;
    a.textContent = t.label;
    a.title = t.description;
    list.append(a);
  }
}

function renderHome() {
  const root = $('homeCategories');
  root.replaceChildren();
  for (const cat of CATEGORIES) {
    const block = document.createElement('div');
    block.className = 'home-cat';
    const h = document.createElement('h3');
    h.textContent = cat.label;
    block.append(h);
    const ul = document.createElement('div');
    ul.className = 'home-links';
    for (const t of TOOLS.filter(x => x.category === cat.id && x.id !== 'home')) {
      const a = document.createElement('a');
      a.href = '#' + t.id;
      a.textContent = t.label;
      ul.append(a);
    }
    block.append(ul);
    root.append(block);
  }
}

function fillZones(selectIds, defaultZone = 'Asia/Shanghai') {
  const zones = listTimeZones();
  for (const id of selectIds) {
    const sel = $(id);
    if (!sel || sel.options.length) continue;
    for (const z of zones) {
      const o = document.createElement('option');
      o.value = z;
      o.textContent = z;
      sel.append(o);
    }
    sel.value = zones.includes(defaultZone) ? defaultZone : zones[0];
  }
}

window.addEventListener('hashchange', route);
renderNav();
renderDiscoverList();
fillZones(['tsDisplayZone', 'tsSourceZone', 'cronZone']);
route();
resetResult();

function sizeOK(text) {
  return new TextEncoder().encode(text).length <= MAX_BYTES;
}

function previewValue(v) {
  if (v === undefined) return '(不存在)';
  const s = JSON.stringify(v);
  return s.length > 500 ? s.slice(0, 500) + '…（预览截断）' : s;
}

function renderDiff(result) {
  for (const c of result.changes) {
    const row = document.createElement('div');
    row.className = 'diff-row';
    const type = document.createElement('b');
    type.textContent = c.type;
    const path = document.createElement('code');
    path.textContent = c.path === '' ? '""（根路径）' : c.path;
    const pre = document.createElement('pre');
    pre.textContent = `之前：${previewValue(c.before)}\n之后：${previewValue(c.after)}`;
    row.append(type, path);
    if (c.path) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '加入脱敏路径';
      btn.onclick = () => {
        const paths = new Set($('paths').value.split('\n').filter(Boolean));
        paths.add(c.path);
        $('paths').value = [...paths].join('\n');
        status('已加入路径；切换到「路径脱敏」可预览。');
      };
      row.append(btn);
    }
    row.append(pre);
    $('diffResults').append(row);
  }
}

function run(action) {
  stop();
  resetResult();
  if (!sizeOK($('a').value) || (action === 'diff' && !sizeOK($('b').value))) {
    status('单份 JSON 超过 1 MiB，请减小文件。', 'error');
    return;
  }
  busy(true);
  status('本地 Worker 处理中… 可随时取消。');
  try {
    worker = new Worker(new URL('./worker.js', import.meta.url), {type: 'module'});
    activeId = ++nextId;
    worker.onmessage = e => {
      if (e.data.id !== activeId) return;
      const d = e.data;
      stop();
      if (d.error) {
        status(d.error, 'error');
        return;
      }
      if (action === 'diff') {
        renderDiff(d.result);
        output(JSON.stringify(d.result, null, 2), true);
        status(`完成：${d.result.changes.length} 条差异。${d.result.truncated ? '达到 2,000 条上限。' : ''}`, d.result.truncated ? 'error' : 'success');
      } else {
        output(d.result, action !== 'ts');
        status(action === 'redact' ? '脱敏副本已生成。' : action === 'ts' ? '类型已推断；请人工审阅。' : '处理完成。', 'success');
      }
    };
    worker.onerror = () => {
      stop();
      status('Worker 无法完成任务。', 'error');
    };
    worker.postMessage({id: activeId, action, a: $('a').value, b: $('b').value, paths: $('paths').value});
    timer = setTimeout(() => {
      stop();
      status('任务超过 10 秒，已终止 Worker。', 'error');
    }, 10000);
  } catch {
    stop();
    status('无法启动模块 Worker；请通过 HTTP(S) 访问。', 'error');
  }
}

$('run').onclick = () => run({compare: 'diff', redact: 'redact', types: 'ts', utilities: 'format'}[mode]);
$('cancel').onclick = () => { stop(); status('任务已取消；输入保留。'); };
document.querySelectorAll('[data-action]').forEach(b => { b.onclick = () => run(b.dataset.action); });

for (const x of ['a', 'b']) {
  $(x).oninput = () => { stop(); resetResult(); counts(); status('输入已变更，请重新处理。'); };
}
$('paths').oninput = () => { stop(); resetResult(); status('路径已变更，请重新生成预览。'); };

$('sample').onclick = () => {
  stop();
  $('a').value = JSON.stringify(sampleA, null, 2);
  $('b').value = JSON.stringify(sampleB, null, 2);
  $('paths').value = '/user/email\n/token';
  $('utilityInput').value = '你好，world / ?a=1';
  resetResult();
  counts();
  status('已加载虚构演示样例。');
};

$('clear').onclick = () => {
  stop();
  for (const x of ['a', 'b', 'paths', 'utilityInput']) $(x).value = '';
  $('file').value = '';
  resetResult();
  counts();
  status('已清空所有当前输入与结果。');
};

$('file').onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  stop();
  if (f.size > MAX_BYTES) {
    status('文件超过 1 MiB，未读取。', 'error');
    e.target.value = '';
    return;
  }
  try {
    const text = await f.text();
    if (!sizeOK(text)) throw Error('文件超过 1 MiB。');
    $('a').value = text;
    resetResult();
    counts();
    status('已导入左侧样例。');
  } catch (err) {
    status('读取失败：' + err.message, 'error');
  }
  e.target.value = '';
};

$('useResult').onclick = () => {
  if (!resultJSON) return;
  $('a').value = lastResult;
  resetResult();
  counts();
  status('已将结果作为新样例。');
};

$('copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(lastResult);
    status('结果已复制。', 'success');
  } catch {
    $('output').focus();
    $('output').select();
    status('未获剪贴板权限，请手动复制。', 'error');
  }
};

$('download').onclick = () => {
  if (!lastResult) return;
  const blob = new Blob([lastResult], {type: 'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = mode === 'types' ? 'api-response.ts' : resultJSON ? 'workbench-result.json' : 'workbench-result.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function simple(fn) {
  stop();
  resetResult();
  if (!sizeOK($('utilityInput').value)) {
    status('输入不得超过 1 MiB。', 'error');
    return;
  }
  try {
    output(fn());
    status('处理完成。', 'success');
  } catch (e) {
    status(e instanceof URIError ? 'URL 编码无效。' : e.message, 'error');
  }
}

$('encode').onclick = () => simple(() => urlTool($('utilityInput').value, 'encode'));
$('decode').onclick = () => simple(() => urlTool($('utilityInput').value, 'decode'));

$('toolSearch').oninput = e => renderDiscoverList(e.target.value);

$('tsFromEpoch').onclick = () => {
  try {
    const text = fromEpoch($('tsInput').value, $('tsUnit').value, $('tsDisplayZone').value);
    $('outputTimestamp').value = text;
    subStatus('statusTimestamp', '转换完成。', 'success');
  } catch (e) {
    subStatus('statusTimestamp', e.message, 'error');
  }
};

$('tsNow').onclick = () => {
  const u = $('tsUnit').value;
  $('tsInput').value = String(u === 's' ? Math.floor(Date.now() / 1000) : Date.now());
  $('tsFromEpoch').click();
};

$('tsToEpoch').onclick = () => {
  try {
    $('outputTimestamp').value = localToEpoch($('tsDatetime').value, $('tsSourceZone').value, $('tsUnit').value);
    subStatus('statusTimestamp', '转换完成。', 'success');
  } catch (e) {
    subStatus('statusTimestamp', e.message, 'error');
  }
};

function runRegexJob() {
  stopRegex();
  const pattern = $('regexPattern').value;
  let flags = $('regexFlags').value;
  if ($('regexGlobal').checked && !flags.includes('g')) flags += 'g';
  const text = $('regexText').value;
  $('regexRun').disabled = true;
  $('regexCancel').hidden = false;
  subStatus('statusRegex', 'Worker 执行中…');
  try {
    regexWorker = new Worker(new URL('./regex-worker.js', import.meta.url), {type: 'module'});
    regexWorkerGeneration += 1;
    document.documentElement.dataset.regexWorkerGeneration = String(regexWorkerGeneration);
    document.documentElement.dataset.regexWorkerPhase = 'running';
    const id = ++regexActiveId;
    regexWorker.onmessage = e => {
      if (e.data.id !== id) return;
      if (e.data.lifecycle === 'started') return;
      stopRegex('idle');
      if (e.data.error) subStatus('statusRegex', e.data.error, 'error');
      else {
        $('outputRegex').value = e.data.result;
        subStatus('statusRegex', '完成。', 'success');
      }
    };
    regexWorker.onerror = () => {
      stopRegex('terminated');
      subStatus('statusRegex', 'Worker 错误。', 'error');
    };
    regexWorker.postMessage({id, pattern, flags, text, global: $('regexGlobal').checked});
    regexTimer = setTimeout(() => {
      stopRegex('terminated');
      $('outputRegex').value = '';
      subStatus('statusRegex', '超过 3 秒已终止 Worker；可立即再次运行。', 'error');
    }, REGEX_TIMEOUT_MS);
  } catch (e) {
    stopRegex();
    subStatus('statusRegex', e.message, 'error');
  }
}

$('regexRun').onclick = runRegexJob;
$('regexCancel').onclick = () => { stopRegex('terminated'); subStatus('statusRegex', '已取消；可再次运行。'); };

$('jwtDecode').onclick = () => {
  try {
    const d = decodeJwt($('jwtInput').value);
    $('outputJwt').value = [
      '=== 安全警告（每次解码均适用）===',
      ...d.warnings.map(w => '• ' + w),
      '',
      '=== Header ===',
      d.headerJson,
      '',
      '=== Payload ===',
      d.payloadJson,
      '',
      '=== Signature（未验证，仅展示 Base64URL 段）===',
      d.signatureSegment,
    ].join('\n');
    subStatus('statusJwt', '已解码（签名未验证，内容不可信）。', 'error');
  } catch (e) {
    subStatus('statusJwt', e.message, 'error');
    $('outputJwt').value = '';
  }
};

function runCronJob() {
  stopCron();
  const count = Number($('cronCount').value);
  const expression = $('cronExpr').value;
  const timeZone = $('cronZone').value;
  $('cronRun').disabled = true;
  $('cronCancel').hidden = false;
  subStatus('statusCron', `正在 Worker 中搜索（最多 ${CRON_SEARCH_DAYS} 天）… 可随时取消。`);
  document.documentElement.dataset.cronWorkerPhase = 'running';
  try {
    cronWorker = new Worker(new URL('./cron-worker.js', import.meta.url), {type: 'module'});
    const id = ++cronActiveId;
    cronWorker.onmessage = e => {
      if (e.data.id !== id) return;
      if (e.data.lifecycle === 'started') return;
      stopCron('idle');
      if (e.data.error) {
        subStatus('statusCron', e.data.error, 'error');
        $('outputCron').value = '';
        return;
      }
      const r = e.data.result;
      $('outputCron').value = formatCronOutput(r);
      subStatus('statusCron', `已生成 ${r.runs.length} 次预览（${CRON_SEARCH_DAYS} 天窗口内）。`, 'success');
    };
    cronWorker.onerror = () => {
      stopCron('terminated');
      subStatus('statusCron', 'Cron Worker 错误。', 'error');
    };
    cronWorker.postMessage({id, expression, timeZone, count, fromMs: Date.now()});
  } catch (e) {
    stopCron('terminated');
    subStatus('statusCron', e.message, 'error');
  }
}

$('cronRun').onclick = runCronJob;
$('cronCancel').onclick = () => {
  stopCron('terminated');
  subStatus('statusCron', '搜索已取消；可立即重新运行。');
  $('outputCron').value = '';
};

document.querySelectorAll('[data-hash]').forEach(btn => {
  btn.onclick = async () => {
    try {
      const algo = btn.dataset.hash;
      const hex = await digestText(algo, $('hashInput').value);
      $('outputHash').value = `${algo}\n${hex}`;
      subStatus('statusHash', '摘要完成。', 'success');
    } catch (e) {
      subStatus('statusHash', e.message, 'error');
    }
  };
});

$('uuidGen').onclick = () => {
  const u = uuidV4();
  $('outputHash').value = `UUID v4 (crypto)\n${u}`;
  subStatus('statusHash', '已生成 UUID v4。', 'success');
};

$('uuidValidate').onclick = () => {
  try {
    const u = validateUuid($('hashInput').value);
    $('outputHash').value = `有效 UUID\n${u}`;
    subStatus('statusHash', '格式有效。', 'success');
  } catch (e) {
    subStatus('statusHash', e.message, 'error');
  }
};

$('support').onclick = () => $('supportDialog').showModal();
$('privacy').onclick = () => $('privacyDialog').showModal();
document.querySelectorAll('[data-close]').forEach(b => { b.onclick = () => $(b.dataset.close).close(); });

if (typeof SUPPORT_IMAGE === 'string' && /^personal-assets\/[A-Za-z0-9._-]+\.png$/.test(SUPPORT_IMAGE)) {
  const url = import.meta.env.BASE_URL + SUPPORT_IMAGE;
  const container = $('supportContent');
  container.replaceChildren();
  const image = document.createElement('img');
  image.src = url;
  image.alt = '维护者自愿打赏收款码';
  const open = document.createElement('a');
  open.href = url;
  open.target = '_blank';
  open.rel = 'noopener';
  open.textContent = '放大原图 ↗';
  const download = document.createElement('a');
  download.href = url;
  download.download = 'support-code.png';
  download.textContent = '下载原图 ↓';
  const actions = document.createElement('div');
  actions.className = 'support-actions';
  actions.append(open, download);
  container.append(image, actions);
}

export {route, runRegexJob, REGEX_TIMEOUT_MS};