/**
 * MindFlow 类型定义
 *
 * 本文件为《MindFlow 双仓库协作契约 v0.1》§2 / §5 / §6 的**逐字复制**，
 * 权威源：mindflow 桌面仓库 CONTRACT.md，签名冲突时以契约为准。
 *
 * TODO(mindflow-core)：本文件将来整体替换为 `mindflow-core` 包导入
 * （`import type { MindDoc } from 'mindflow-core'`），期间禁止擅改任何签名。
 */

// ══════════════ §2 文档模型（.mflow 格式 v1） ══════════════
// 文件 = 下述 MindDoc 的 JSON.stringify(doc, null, 2)，扩展名 .mflow。

export type NodeId = string;

export type StructureType =
  | 'logic-right'   // 逻辑图（右向）
  | 'mindmap'       // 思维导图（左右发散）
  | 'org-chart'     // 组织架构（上下）
  | 'fishbone'      // 鱼骨图
  | 'timeline-h'    // 时间轴（横向）
  | 'timeline-v'    // 时间轴（纵向）
  | 'tree';         // 树形图（向下直角连线）

export interface NodeStyle {
  fill?: string;                       // '#RRGGBB[AA]'
  textColor?: string;
  border?: { color?: string; width?: number };
  shape?: 'rounded-rect' | 'rect' | 'ellipse' | 'underline' | 'diamond';
  fontWeight?: 'normal' | 'bold';
  fontSize?: number;
}

export interface DocNode {
  id: NodeId;
  text: string;                        // 节点文字，可含 \n（不自动换行，宽度=最长行）
  note?: string;                       // 备注
  children: DocNode[];                 // 嵌套树；所有更新走不可变（Immer 或手写结构共享）
  collapsed?: boolean;                 // true 时布局/渲染跳过整个子树
  style?: NodeStyle;                   // 缺省继承主题
  icons?: string[];                    // 图标 id，如 'priority-1' 'star'
  labels?: string[];                   // 文字标签
}

export interface MindDoc {
  formatVersion: 1;
  id: string;                          // 文档 id
  title: string;                       // 列表页显示名（= root.text 镜像，保存时同步）
  structure: StructureType;
  theme: string;                       // 主题 id，见 §5
  root: DocNode;                       // 根节点 = 中心主题
  createdAt: string;                   // ISO 8601
  updatedAt: string;
}

export interface DocMeta {
  id: string; title: string; updatedAt: string; nodeCount: number;
}

// ══════════════ §5 主题 ══════════════

export interface Theme {
  id: string;
  name: string;                    // 中文显示名
  background: string;
  nodeFillByLevel: string[];       // 逐级节点填充色，层级超出取末位
  branchColorByLevel: string[];    // 逐级连线色
  textColor: string;
  rootStyle: NodeStyle;            // 根节点强制样式
}

// ══════════════ §6 存储与文档服务 ══════════════

export interface StorageAdapter {              // 网页版 = IndexedDB 实现；桌面 = 文件系统实现
  list(): Promise<DocMeta[]>;
  load(id: string): Promise<MindDoc | null>;
  save(doc: MindDoc): Promise<void>;           // 防抖由上层负责
  delete(id: string): Promise<void>;
}

export interface DocumentService {
  getDoc(): MindDoc;
  update(mutator: (draft: MindDoc) => void): void;   // Immer 产生新文档 → 入 undo 栈 → 触发订阅 → 计划自动保存
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean; canRedo(): boolean;
  subscribe(listener: (doc: MindDoc) => void): () => void;  // 返回退订函数
  flushSave(): Promise<void>;                   // 立即落盘（切 tab / 关闭前调用）
}

// 注：契约原文为 `export function`（规格写法）；在 .ts 文件中无实现体必须
// 写成环境声明（declare），参数与返回值签名逐字不变。实现见 services/documentService.ts。
export declare function createDocumentService(
  adapter: StorageAdapter,
  initial: MindDoc,
  opts?: { autosaveDebounceMs?: number }       // 默认 2000
): DocumentService;
