# MindFlow Web（网页版仓库）

开源思维导图软件 **MindFlow** 的网页版。与桌面版仓库 `mindflow`（权威源）共享引擎与 UI 组件，本仓库负责 Web 特有部分：IndexedDB 存储、PWA 离线、GitHub Pages 部署。

## 技术栈

- Vite + React + TypeScript
- 存储适配：IndexedDB（idb），文档格式 `.mflow`（契约见桌面仓库 `CONTRACT.md`）

## 开发

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # 产物 dist/
```

## 与桌面仓库的关系

- 引擎与 UI 组件以 npm 包（`mindflow-core` / `mindflow-ui`）从桌面仓库引用，**禁止在本仓库复制引擎代码**；
- 接口契约（文档模型 / StorageAdapter / 布局类型）以桌面仓库 `CONTRACT.md` 为唯一权威。
