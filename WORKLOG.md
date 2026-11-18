# 开发工作日志

> 本文件由 code-review-worklog 技能自动维护：记录每次需求澄清的问答、代码变更、Bug 及修复方案、所有需求及其实现状态。请保留全部结构标题与表格，条目按时间顺序追加。

- **日志创建时间**：2026-11-18 20:13:49
- **最近更新**：2026-11-18 20:44:01
- **最新版本**：v0.14.0
---

## 需求跟踪

| ID | 需求描述 | 提出时间 | 状态 | 备注 |
|----|---------|---------|------|------|
| REQ-001 | TS 迁移基建：JSX 脚手架转 TSX strict + React 19 升级 + 安装 idb/immer/nanoid | 2026-11-18 20:15:12 | 已完成 |  |
| REQ-002 | src/types.ts 逐字复制契约 §2/§5/§6 类型 | 2026-11-18 20:15:12 | 已完成 |  |
| REQ-003 | IndexedDB StorageAdapter（idb，db=mindflow store=docs keyPath=id） | 2026-11-18 20:15:12 | 已完成 |  |
| REQ-004 | DocumentService 临时实现（Immer undo 栈 + 2s 防抖 + subscribe + flushSave） | 2026-11-18 20:15:12 | 已完成 |  |
| REQ-005 | 文档列表页：新建/重命名/删除/DocMeta 展示 | 2026-11-18 20:15:12 | 已完成 |  |
| REQ-006 | 编辑页：多文档标签栏 + 画布/大纲 stub 组件（§7 同签名真实改文档） | 2026-11-18 20:15:12 | 已完成 |  |
| REQ-007 | .mflow 导入导出（JSON 校验 + Blob 下载 + FSAA 写回） | 2026-11-18 20:15:12 | 已完成 |  |
| REQ-008 | 移动端 <768px 适配（大纲主入口/底部抽屉/44px 触控/pinch 手势/安全区） | 2026-11-18 20:15:12 | 已完成 |  |
| REQ-009 | PWA：manifest + vite-plugin-pwa 离线缓存 | 2026-11-18 20:15:13 | 已完成 |  |
| REQ-010 | GitHub Pages 部署工作流 + vite base | 2026-11-18 20:15:13 | 已完成 |  |

<!--
  状态取值：待实现 / 进行中 / 已完成 / 已取消
  新需求行由脚本（add-req）追加在表格末尾，update-req 修改状态列。
-->

## 澄清记录

<!-- 每完成一轮需求澄清，由脚本（add-clarify）在此节末尾逐条追加问答条目，提问与回答分别列出。格式示例：

  ### CLAR-XXX ｜ 2026-09-05 19:50:00
  - **需求关联**：REQ-XXX
  - **提问**：向用户澄清的问题
  - **回答**：用户的答复
-->

## 经验暂存

<!-- 每次判定出可沉淀经验时，由脚本（add-exp）暂存于此，状态=待确认；用户确认功能测试正常后，下一轮对话再去重沉淀到领域 skill（update-exp 更新状态）。格式示例：

  ### EXP-XXX ｜ 2026-09-06 19:00:00
  - **经验内容**：现象 → 根因 → 修法
  - **候选目标**：macos-app-development
  - **来源变更**：CHG-XXX
  - **状态**：待确认
-->

## 变更历史

<!-- 每次代码生成 / 修改 / 删除 / 清理后，由脚本（add-change）在此节末尾追加一个条目。格式示例：

  ### CHG-XXX ｜ 2026-09-01 19:45:12 ｜ 修改
  - **文件**：`src/app.py`、`src/config.py`
  - **需求关联**：REQ-XXX
  - **变更摘要**：一句话说明改了什么、为什么改
  - **自查结论**：通过（逻辑 / 规范 / 性能 / 安全 / 可维护性 / 兼容性 / 测试）
-->

### CHG-001 ｜ 2026-11-18 20:16:25 ｜ 新增
- **文件**：`tsconfig.json`、`tsconfig.app.json`、`tsconfig.node.json`、`vite.config.ts`、`src/main.tsx`、`src/App.tsx`、`package.json`、`index.html`
- **需求关联**：REQ-001
- **变更摘要**：TS 迁移基建：JSX 脚手架转 TSX（strict + project references），React 18→19，安装 idb/immer/nanoid，声明 esbuild 构建许可；tsc -b && vite build 实测通过
- **自查结论**：通过（七维自查；输出后校验 tsc -b 0 错误 + vite build 33 模块构建成功）

### CHG-002 ｜ 2026-11-18 20:17:45 ｜ 新增
- **文件**：`src/types.ts`
- **需求关联**：REQ-002
- **变更摘要**：契约 §2/§5/§6 类型逐字复制到 src/types.ts（脚本分节比对逐行一致）；唯一偏差：createDocumentService 加 declare 环境声明（契约规格写法在 .ts 中无实现体不合法），签名逐字不变
- **自查结论**：通过（七维自查；输出后校验 tsc -b 0 错误 + python 分节 diff 三节 PASS）

### CHG-003 ｜ 2026-11-18 20:18:39 ｜ 新增
- **文件**：`src/storage/idbAdapter.ts`、`src/lib/treeUtils.ts`
- **需求关联**：REQ-003
- **变更摘要**：契约 §6 StorageAdapter 的 IndexedDB 实现（idb 库，db=mindflow/store=docs/keyPath=id），list/load/save/delete 全签名；title=root.text 保存时兜底同步；Safari 隐私模式降级内存实现 + isMemoryFallback 提示
- **自查结论**：通过（七维自查；输出后校验 tsc -b 0 错误、vite build 通过；持久化行为待 dev 冒烟验证）

### CHG-004 ｜ 2026-11-18 20:19:17 ｜ 新增
- **文件**：`src/services/documentService.ts`
- **需求关联**：REQ-004
- **变更摘要**：契约 §6 DocumentService 临时实现（文件头 TODO 标记将来由 mindflow-core 替换）：update 走 Immer 不可变更新入无限 undo 栈、2s 防抖自动保存、subscribe 退订函数、flushSave 立即落盘（App 层挂 visibilitychange/beforeunload）
- **自查结论**：通过（七维自查；输出后校验 tsc -b 0 错误；undo/redo/防抖行为待 dev 冒烟验证）

### CHG-005 ｜ 2026-11-18 20:20:41 ｜ 新增
- **文件**：`src/lib/docFactory.ts`、`src/components/DocumentList.tsx`、`src/styles/global.css`、`src/App.tsx`、`src/main.tsx`、`src/vite-env.d.ts`
- **需求关联**：REQ-005
- **变更摘要**：文档列表页：新建（契约 §2 空文档规范）/重命名（title 与 root.text 同步）/删除（confirm 防误触）/DocMeta 展示；全局样式含 44px 触控基线；App 接入存储生命周期；补 vite-env.d.ts 修复 css 副作用导入类型报错
- **自查结论**：通过（七维自查；输出后校验 tsc -b 0 错误、vite build 通过；交互行为待 dev 冒烟验证）

### CHG-006 ｜ 2026-11-18 20:26:47 ｜ 新增
- **文件**：`src/components/stubs/MindMapCanvasStub.tsx`、`src/components/stubs/OutlineViewStub.tsx`、`src/components/stubs/InspectorStub.tsx`、`src/components/stubs/ThemeGalleryStub.tsx`、`src/components/stubs/builtinThemes.ts`、`src/lib/treeUtils.ts`
- **需求关联**：REQ-006
- **变更摘要**：四个契约 §7 同 props 签名的 stub 组件（画布/大纲/检查器/主题库），内部经 onDocChange/onNodeChange/onSelect 真实修改文档；树工具扩展 findNode/findParent/removeNode；6 个内置主题占位数据；blur/Enter 提交保证 undo 粒度完整
- **自查结论**：通过（七维自查；tsc -b 修复 2 处 mutator 误传 produce 结果的 TS2345 后 0 错误；vite build 通过）

### CHG-007 ｜ 2026-11-18 20:26:47 ｜ 新增
- **文件**：`src/hooks/useDocument.ts`、`src/components/TabBar.tsx`
- **需求关联**：REQ-006
- **变更摘要**：useDocument hook（useSyncExternalStore 订阅 DocumentService）+ 顶部多文档标签栏（切换/关闭/返回列表，44px 触控）
- **自查结论**：通过（useSyncExternalStore 要求 subscribe/getSnapshot 稳定引用，service 工厂闭包满足；tsc -b 0 错误）

### CHG-008 ｜ 2026-11-18 20:26:47 ｜ 新增
- **文件**：`src/components/EditorPage.tsx`、`src/components/ActiveDocPane.tsx`、`src/App.tsx`、`src/styles/global.css`
- **需求关联**：REQ-006
- **变更摘要**：编辑页：每文档一个 DocumentService 会话（undo 栈随标签保留）、切走/页面隐藏/卸载时 flushSave 落盘（visibilitychange+pagehide，摘要注明 beforeunload async 不可靠）、撤销重做快捷键 Cmd/Ctrl+Z、画布/大纲切换（小屏默认大纲）、检查器/主题库侧栏；App 接入列表↔编辑视图与标签页状态
- **自查结论**：通过（七维自查；tsc -b 0 错误、vite build 通过；多标签与落盘行为待 dev 冒烟验证）

### CHG-009 ｜ 2026-11-18 20:28:07 ｜ 新增
- **文件**：`src/lib/mflowFile.ts`、`src/components/DocumentList.tsx`、`src/components/ActiveDocPane.tsx`、`src/styles/global.css`
- **需求关联**：REQ-007
- **变更摘要**：.mflow 导入导出：FileReader 读取 + 严格校验（formatVersion 必须为 1、结构白名单、递归形状校验）；导出优先 File System Access API 写回、降级 Blob 下载（文件名 MindFlow-标题.mflow，导出前同步 title 镜像）；导入 id 冲突生成新副本；顺带修复标签栏标题不同步 root.text 的隐患
- **自查结论**：通过（七维自查；tsc -b 0 错误、vite build 通过；导入导出全链路待 dev 冒烟验证）

### CHG-010 ｜ 2026-11-18 20:31:48 ｜ 新增
- **文件**：`index.html`、`src/hooks/useIsMobile.ts`、`src/components/BottomSheet.tsx`、`src/styles/global.css`
- **需求关联**：REQ-008
- **变更摘要**：移动端基座：viewport-fit=cover + theme-color、useIsMobile（matchMedia 实时）、通用 BottomSheet 组件（遮罩/Esc/安全区）
- **自查结论**：通过（七维自查；tsc -b 0 错误、vite build 通过）

### CHG-011 ｜ 2026-11-18 20:31:48 ｜ 新增
- **文件**：`src/components/stubs/canvasGestures.ts`、`src/components/stubs/MindMapCanvasStub.tsx`
- **需求关联**：REQ-008
- **变更摘要**：画布 stub 触摸手势（契约 §7.1）：pinch 缩放（围绕中点、clamp 0.3-3）+ 双指平移（原生事件 passive:false 接管、transform 命令式直写避免每帧 setState）+ 长按 500ms 唤出节点菜单（编辑/加子/删）+ 长按后 click 抑制 + 复位视图按钮
- **自查结论**：通过（双指中点缩放公式按 transform-origin 0 0 推导；React 合成 touch 事件 passive 不能 preventDefault，改原生绑定；tsc -b 0 错误；待手机模拟实测）

### CHG-012 ｜ 2026-11-18 20:31:48 ｜ 新增
- **文件**：`src/components/DocListSheet.tsx`、`src/components/ActiveDocPane.tsx`、`src/components/EditorPage.tsx`、`src/components/TabBar.tsx`、`src/App.tsx`、`src/styles/global.css`
- **需求关联**：REQ-008
- **变更摘要**：抽屉集成：小屏检查器/主题库折叠为底部抽屉（工具栏「样式/主题」按钮）、文档列表 DocListSheet 抽屉（TabBar actions 插槽）；<768px 媒体查询（列表项纵向堆叠、侧栏隐藏、按钮 44px）+ iOS 安全区 padding
- **自查结论**：通过（七维自查；tsc -b 0 错误、vite build 通过；抽屉/布局待手机模拟实测）

### CHG-013 ｜ 2026-11-18 20:43:17 ｜ 新增
- **文件**：`vite.config.ts`、`public/icons/icon.svg`、`public/icons/pwa-192.png`、`public/icons/pwa-512.png`
- **需求关联**：REQ-009
- **变更摘要**：PWA：vite-plugin-pwa（registerType autoUpdate + Workbox 预缓存全部静态产物，navigateFallback SPA）；manifest 名称 MindFlow + 192/512/maskable 图标（SVG 经 qlmanage 生成 PNG）；构建产物 manifest.webmanifest/sw.js/precache 10 entries 294KB 实测生成
- **自查结论**：通过（七维自查；tsc -b 0 错误；build 输出实测 manifest+sw+图标齐全，manifest 生效证据待 preview 冒烟抓取）

### CHG-014 ｜ 2026-11-18 20:44:01 ｜ 新增
- **文件**：`.github/workflows/deploy.yml`、`vite.config.ts`
- **需求关联**：REQ-010
- **变更摘要**：GitHub Pages 部署：vite base=/mindflow-web/（实测资源/manifest/SW 注册路径全部带前缀、manifest scope 自动适配）；deploy.yml 用官方 upload-pages-artifact+deploy-pages 模式（pnpm 10 + Node 22 + frozen-lockfile + 最小权限 + 并发组）
- **自查结论**：通过（七维自查；pnpm build 实测产物路径带 base；Actions 待 push 后远端运行验证）

## Bug 记录

<!-- 每个 Bug 由脚本（add-bug）在此节末尾追加一个条目，无论是否已修复都要记录。格式示例：

  ### BUG-XXX ｜ 2026-09-01 19:50:00
  - **现象**：错误的具体表现
  - **原因**：根因分析
  - **修复方案**：采用的修复方式
  - **关联变更**：CHG-XXX
  - **状态**：已修复
-->

### BUG-001 ｜ 2026-11-18 20:20:41
- **现象**：tsc -b 报 TS2882：main.tsx 副作用导入 global.css 无类型声明
- **原因**：TypeScript 严格校验副作用导入（noUncheckedSideEffectImports 语义），css 模块缺少 vite/client 类型声明
- **修复方案**：新增 src/vite-env.d.ts 引用 vite/client 类型（Vite 官方模板标准做法）
- **关联变更**：CHG-005
- **状态**：已修复

### BUG-002 ｜ 2026-11-18 20:26:47
- **现象**：ActiveDocPane 两处 service.update(produce(...)) 类型错 TS2345：误传 Immer 结果对象而非 mutator 函数
- **原因**：把 produce(base, recipe) 的同步结果当成了 update 的 mutator 参数；update 契约签名要求 (draft)=>void 函数
- **修复方案**：改为 mutator 直接在 draft 上操作（service.update(d => {...})），删除多余 produce 包裹
- **关联变更**：CHG-006
- **状态**：已修复

