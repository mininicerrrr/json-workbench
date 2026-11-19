# JSON Workbench

**前端接口响应工作台 · Local-first API response workbench**

比较接口响应 → JSON Pointer 定位 → 脱敏副本 → TypeScript 样例推断。
专注这个工作流，不收集输入、不登录、不用几十个无关工具凑数量。

> Pages 尚需仓库所有者配置并完成 Actions 部署。预期项目路径为 `/json-workbench/`；本 README 不代表站点已经上线。

## 本地使用

Node.js 24（与 CI 一致）：
```sh
npm ci
npm test
npm run dev
# 打开终端显示地址下的 /json-workbench/
npm run build
npm run preview
```
生产文件在 `dist/`。双击 HTML（file://）不支持模块 Worker，请通过 HTTP(S) 使用。

## 工作流

1. **语义对比**：粘贴两份或导入左侧 JSON；忽略对象键顺序，数组按索引比较（不是按 id 匹配）。新增/删除/修改带 RFC 6901 JSON Pointer；空字符串表示根路径。
2. **路径脱敏**：每行一个精确 Pointer，例如 `/user/email`、`/items/0/token`。`~` 写作 `~0`，`/` 写作 `~1`；不支持通配符。路径不存在会报错。输入不会自动改动；检查结果后可手动“用结果作为新样例”。空行忽略，UI 不支持根路径脱敏。
3. **TypeScript**：从当前左侧样例生成 `ApiResponse`。只推断当前样例可见的基本类型、对象和数组联合，不推断可选字段或完整 schema。建议先脱敏再生成，必须人工审阅。
4. **基础工具**：严格 JSON 格式化/压缩、URL 组件编解码、显式北京时间/UTC 的秒毫秒时间戳双向转换。URL 不是整站 URL 编码器，+ 不作为空格解码。

## 安全与限制

- 输入保留浏览器内存，不上传、不写入 URL、Cookie、localStorage；无统计/外链脚本。hash 仅保存固定工具名。导入文件不上传。
- JSON 处理在专用模块 Worker 中运行，可取消；10 秒超时终止。主线程仅负责输入、大小预检和结果展示。URL/时间基础操作限 1 MiB。
- 每份 JSON 上限 1 MiB、嵌套上限 80；差异上限 2,000，超限明确标记结果不完整。超大/深输入不会被自动“修复”。
- 严格禁止注释、尾逗号和重复键（含 Unicode 转义后重名），阻止不安全整数及非有限数字。大整数 ID 应作为字符串。
- 其他小数/指数仍遵循 JavaScript IEEE-754，不是任意精度解析器；例如某些精确财务小数请使用字符串或专用高精度工具。格式化不保留原始数字书写形式。
- 脱敏只替换指定路径，不是秘密扫描器；自由文本、其他字段可能仍含敏感信息。分享前人工核对。
- 输入从不作为 HTML 执行。CSP 仅允许同源脚本/Worker；同源连接用于静态模块加载，应用代码不发送用户输入。静态托管方可能记录普通访问日志，包括 IP。
- 浏览器/扩展/系统本身不在本工具保护范围；不构成安全审计或合规保证。

## GitHub Pages

`vite.config.js` 的 `base: '/json-workbench/'` 全面用于构建资源、Worker 与可选收款码路径。使用固定 hash 路由（`#compare`/`#redact`/`#types`/`#utilities`），不要求 history fallback，刷新子功能不应 404。

1. 仓库为 `mininicerrrr/json-workbench`、默认分支 `main`（由所有者创建/授权；本代码包不自行建仓）。
2. Settings → Pages → Source 选择 **GitHub Actions**。
3. 推送源码，包含 `.github/workflows/pages.yml`、`package-lock.json`；不要推送 node_modules、dist、凭据或个人环境文件。
4. Actions 执行 npm ci → 测试 → 构建 → upload-pages-artifact → deploy-pages；PR 只测试构建、不部署。部署 job 需要 `pages: write` 和 `id-token: write`，环境为 `github-pages`，必要时由所有者允许 main 部署。
5. 使用 Actions 实际输出的 `page_url` 验证网页、Worker、CSS、可选二维码、hash 刷新。不要把预计 URL 当作已部署证据。

官方参考：
- https://vite.dev/guide/static-deploy.html#github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

Pages 仅用作免费开源项目工具演示，不作为商业 SaaS、电商或收款主导网站。打赏自愿且不解锁功能。上线不会自动产生访问量。

## 可选打赏与许可

本部署版本已由所有者授权配置 `public/personal-assets/wechat-support.png`。该原图会公开进入仓库历史，不属于 MIT。通用开源模板默认 `SUPPORT_IMAGE = null`；fork 时应移除个人素材并禁用打赏。

仅在得到图片所有者明确公开授权后：
1. 原图原样放 `public/personal-assets/wechat-support.png`（不要裁切/重绘二维码）。
2. 配置 `export const SUPPORT_IMAGE = 'personal-assets/wechat-support.png';`。
3. 重新构建；图片会随静态站公开，可能显示头像/收款名。它不是密钥。公开仓库会保留其 Git 历史，fork 前请移除个人素材。
4. 页面允许打开原图、下载/保存；无默认金额、支付 API 或支付完成状态。支付在微信处理，本站非微信官方。

**MIT 仅覆盖代码和文档；二维码、头像、收款名等个人素材明确排除**，见 ASSETS-LICENSE.md。依赖保留各自许可证。

## 测试与截图

`npm test` 覆盖严格解析、重复键、大整数、大小/深度上限、数组与对象语义、Pointer 转义/原型键、非突变脱敏、类型推断和基础工具。需另外做真实浏览器测试（Worker、交互、手机布局、剪贴板、下载、CSP）。
未提供未经验证的截图，欢迎维护者在浏览器验收后添加真实桌面/移动截图；不提供伪造 stars、用户量或收入数据。

## English

A focused, browser-only API JSON workbench: semantic comparison → exact JSON
Pointer redaction preview → sample-inferred TypeScript. No backend, telemetry,
default storage or user data in URLs. JSON runs in a cancellable Worker, capped
at 1 MiB per input, 80 nesting levels and 2,000 reported changes. Duplicate keys,
unsafe integers and non-finite numbers are rejected. Decimal numbers remain
IEEE-754. Types are inferred from one sample, not a schema. Redaction is not a
secret scanner. Review output before sharing. Code/docs are MIT; personal payment
images and identity materials are not. Optional support is disabled by default.
