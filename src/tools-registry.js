/** Tool catalog: hash routes only — never embed user input in URLs. */
export const CATEGORIES = [
  {id: 'json', label: 'JSON 工作流'},
  {id: 'encode', label: '编码与时间'},
  {id: 'inspect', label: '解析与校验'},
  {id: 'generate', label: '生成与摘要'},
];

export const TOOLS = [
  {id: 'home', category: 'json', label: '工具总览', nav: false, title: 'Developer Toolbox · JSON Workbench', description: '浏览器本地开发者工具箱：JSON 对比、脱敏、TypeScript、正则、JWT 解码、Cron、时间戳、哈希与 UUID。不上传输入。'},
  {id: 'compare', category: 'json', label: '语义对比', nav: true, title: 'JSON 语义对比 · JSON Workbench', description: '忽略对象键顺序的 JSON 差异对比，RFC 6901 JSON Pointer 定位变化。浏览器本地处理。'},
  {id: 'redact', category: 'json', label: '路径脱敏', nav: true, title: 'JSON Pointer 脱敏 · JSON Workbench', description: '按精确 JSON Pointer 路径预览脱敏副本，不改动原输入。'},
  {id: 'types', category: 'json', label: 'TypeScript', nav: true, title: 'JSON 推断 TypeScript · JSON Workbench', description: '从单份 JSON 样例推断 TypeScript 类型起点，非完整 schema。'},
  {id: 'utilities', category: 'encode', label: 'JSON/URL', nav: true, title: 'JSON 格式化与 URL · JSON Workbench', description: '严格 JSON 格式化/压缩与 URL 组件编解码。'},
  {id: 'timestamp', category: 'encode', label: '时间戳', nav: true, title: '时间戳与时区 · JSON Workbench', description: '秒/毫秒时间戳与 IANA 时区双向转换，单位与时区显式标注。'},
  {id: 'regex', category: 'inspect', label: '正则测试', nav: true, title: '正则测试（可超时终止）· JSON Workbench', description: '在 Worker 中测试正则，灾难性回溯可超时终止并恢复。'},
  {id: 'jwt', category: 'inspect', label: 'JWT 解码', nav: true, title: 'JWT 解码（不验证签名）· JSON Workbench', description: '仅解码 JWT 结构；不验证签名，解码内容不可信，不构成身份认证。'},
  {id: 'cron', category: 'inspect', label: 'Cron', nav: true, title: 'Cron 解释与下次运行 · JSON Workbench', description: '五字段 Cron 语义说明与带时区的下次运行预览。'},
  {id: 'hash', category: 'generate', label: '哈希 / UUID', nav: true, title: '哈希与 UUID · JSON Workbench', description: 'SHA-256/384/512 摘要与加密安全 UUID v4 生成。'},
];

export const TOOL_MAP = Object.fromEntries(TOOLS.map(t => [t.id, t]));

export function toolsForSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) return TOOLS.filter(t => t.id !== 'home');
  return TOOLS.filter(t => {
    if (t.id === 'home') return false;
    const hay = `${t.label} ${t.description} ${t.category} ${t.id}`.toLowerCase();
    return hay.includes(q);
  });
}