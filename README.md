# Project Files

`io.xsec.project-files` 1.0.0 是 XSEC Desktop 的只读项目文件浏览器。前端使用 React 18.3.1、`@xsec/ui-react` 0.1.7 和 `@xsec/design-tokens` 0.1.2，通过公开控件与 `ControlThemeProvider` 跟随 Host 的明暗主题、密度、字号和减少动态效果偏好。

## 使用

- 展开、折叠项目目录并选择文件预览；搜索范围为已读取的目录列表，按路径（含文件名）匹配。
- 文件树支持方向键、Home、End 和按钮键盘操作，并提供树节点 ARIA 语义。
- 宽屏在右侧预览，窄屏在底部预览；代码显示行号，现有轻量 tokenizer 支持 JS、TS、JSX、TSX、Python、Java、Go、Rust、JSON、CSS 和 HTML。
- 点击“添加到会话”调用 Host 的文件引用接口，Host 确认后显示成功结果。目录、文件或引用操作失败时显示错误；读取失败可通过“重新读取”按钮再次执行。

文件读取只更新当前最新请求的预览。项目或会话切换会使旧视图失效；销毁时释放 React 视图与主题订阅。

## Host 契约与产物

manifest 保持现有插件版本、Frontend API v2、三项 capability 与三个 RPC 方法：

| Capability | 用途 / RPC |
| --- | --- |
| `workspace.project.read` | 读取当前项目绑定 |
| `filesystem.workspace.read` | `xsec.files.list`、`xsec.files.read` |
| `workspace.composer.write` | `xsec.workspace.composer.path.add` |

请求使用 Host 当前项目与会话上下文，响应在前端校验。Host 兼容范围为 XSEC `>=0.1.0`、Plugin API `^1.4.0`。

源码入口为 `frontend-src/index.tsx`。构建生成包含依赖与样式的单个 ESM：`com.xsec.desktop/frontend/index.js`，显式导出 `activate`；第三方许可证写入 `com.xsec.desktop/THIRD_PARTY_NOTICES.txt`。组件库 tarball 位于 `vendor/xsec-ui/`，依赖版本由 `package-lock.json` 固定。

## 开发检查与平台验收

使用 Node.js 24：

```bash
rtk npm ci
rtk npm run check
```

`check` 依次执行 TypeScript 类型检查、生产构建、生成 ESM 的 JavaScript 语法检查和 manifest 校验。单独检查类型或构建可运行 `rtk npm run typecheck`、`rtk npm run build`。

`beta`、`main` 与 PR 的现有 CI 在 Linux、Windows、macOS arm64 和 macOS x86_64 上执行 `npm ci` 与 `npm run check`，覆盖三平台、四个测试目标。这是源码与构建检查；实际 Desktop Host 的挂载、主题更新、文件读取、会话引用和资源释放需另行集成验收。

日常开发、更新和发布采用源码、manifest、构建、包完整性及受影响功能检查。Host API、安装器、原生依赖或平台行为变化时按风险选择 Host 验收目标；完整 Host 矩阵在明确要求时执行。文件路径、快捷键、字体及预览须保持三平台兼容。
