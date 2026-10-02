# Project Files

`io.xsec.project-files` 是 XSEC Desktop 的只读项目文件浏览器。宽屏在右侧预览，窄屏在底部预览；代码预览包含行号与语法高亮，文件引用通过插件内状态气泡确认后加入当前会话。

## 开发检查

```bash
npm run check
```

插件须兼容 Windows、macOS、Linux 三个平台，macOS 同时支持 Apple Silicon（arm64）
和 Intel（x86_64）。完整矩阵因此包含四个 OS/架构测试目标。

`beta`、`main` 与 PR 的现有 CI 在这些目标上运行 `npm run check`，内容是 JavaScript
语法和 manifest 校验，属于源码检查。日常更新和发布默认不运行跨平台 Desktop Host Smoke，
也不以其作为 Marketplace 发布门禁。

涉及 Host API、安装器、原生依赖或平台行为变化时，按风险选择目标进行集成验收；
需要完整矩阵时再显式运行。文件路径、快捷键、字体及预览须保持三平台兼容。
