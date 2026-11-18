import { useState, type JSX } from 'react'
import { nanoid } from 'nanoid'
import { produce } from 'immer'
import type { DocNode, MindDoc, NodeStyle } from '../../types'
import { findNode, removeNode } from '../../lib/treeUtils'
import { getTheme } from './builtinThemes'

/**
 * MindMapCanvas stub 组件 —— 契约 §7 同 props 签名。
 *
 * TODO(mindflow-ui)：将来整体替换为 mindflow-ui 真实画布（React Flow 底座 +
 * mindflow-core 布局引擎），本组件删除即可，编辑页调用处零改动。
 * 本 stub 通过 onDocChange 真实修改文档（不可变更新），编辑行为完整可用：
 * - 节点行内文本编辑（点击进入，blur/Enter 提交——一次操作一次 onDocChange，
 *   保证 undo 栈粒度为完整的一次文本修改，而非每个按键）；
 * - 添加/删除子节点、折叠展开；
 * - 视觉为层级缩进的逻辑图模拟，不实现布局算法（布局引擎属算法实验室分工）。
 */

interface MindMapCanvasProps {
  doc: MindDoc
  onDocChange: (next: MindDoc) => void
}

/** 按深度取节点填充色（超出主题定义层级取末位，契约 §5 语义） */
function fillAt(themeFills: string[], depth: number): string {
  return themeFills[Math.min(depth, themeFills.length - 1)]
}

/** shape → 视觉近似样式（stub 阶段近似呈现，真实渲染由 mindflow-ui 负责） */
function shapeCss(shape: NodeStyle['shape'] | undefined): React.CSSProperties {
  switch (shape) {
    case 'rect':
      return { borderRadius: 0 }
    case 'ellipse':
      return { borderRadius: 999 }
    case 'underline':
      return { borderRadius: 0, border: 'none', boxShadow: 'inset 0 -3px 0 currentColor' }
    case 'diamond':
      return { borderRadius: 4, transform: 'skewX(-12deg)' }
    default:
      return { borderRadius: 8 }
  }
}

export default function MindMapCanvasStub({ doc, onDocChange }: MindMapCanvasProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const theme = getTheme(doc.theme)

  /** 提交节点文本（与原文相同则不产生变更） */
  const commitText = (node: DocNode, text: string): void => {
    if (text === node.text) return
    onDocChange(
      produce(doc, (d) => {
        const target = findNode(d.root, node.id)
        if (target !== null) target.text = text
      }),
    )
  }

  /** 添加子节点并直接进入其行内编辑 */
  const addChild = (node: DocNode): void => {
    const child: DocNode = { id: nanoid(), text: '', children: [] }
    onDocChange(
      produce(doc, (d) => {
        const target = findNode(d.root, node.id)
        if (target !== null) target.children.push({ ...child })
      }),
    )
    setEditingId(child.id)
  }

  /** 删除节点（根节点由 UI 层保护，不在此处理） */
  const deleteOne = (node: DocNode): void => {
    onDocChange(
      produce(doc, (d) => {
        removeNode(d.root, node.id)
      }),
    )
  }

  /** 切换折叠状态（契约 §2：collapsed=true 时布局/渲染跳过整个子树） */
  const toggleCollapsed = (node: DocNode): void => {
    onDocChange(
      produce(doc, (d) => {
        const target = findNode(d.root, node.id)
        if (target !== null) target.collapsed = !target.collapsed
      }),
    )
  }

  /** 渲染单个节点与其子树 */
  const renderNode = (node: DocNode, depth: number): JSX.Element => {
    const hasChildren = node.children.length > 0
    // 节点样式覆盖主题（契约 §2：style 缺省继承主题；根节点主题给出 rootStyle 基准）
    const themeFill = depth === 0 ? theme.rootStyle.fill : fillAt(theme.nodeFillByLevel, depth)
    const nodeCss: React.CSSProperties = {
      ...shapeCss(node.style?.shape ?? (depth === 0 ? theme.rootStyle.shape : undefined)),
      background: node.style?.fill ?? themeFill,
      color:
        node.style?.textColor ??
        (depth === 0 ? theme.rootStyle.textColor : undefined) ??
        theme.textColor,
      fontWeight:
        node.style?.fontWeight === 'bold' || (depth === 0 && theme.rootStyle.fontWeight === 'bold')
          ? 700
          : 400,
      fontSize: node.style?.fontSize,
    }
    return (
      <div key={node.id} className="mm-branch">
        <div className="mm-node" style={nodeCss} data-depth={depth}>
          {hasChildren && (
            <button
              type="button"
              className="mm-toggle"
              aria-label={node.collapsed ? '展开' : '折叠'}
              onClick={() => toggleCollapsed(node)}
            >
              {node.collapsed ? '▸' : '▾'}
            </button>
          )}
          {editingId === node.id ? (
            <input
              className="mm-edit"
              autoFocus
              defaultValue={node.text}
              onBlur={(e) => {
                commitText(node, e.target.value)
                setEditingId(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitText(node, e.currentTarget.value)
                  setEditingId(null)
                }
              }}
              aria-label="节点文本"
            />
          ) : (
            <button type="button" className="mm-label" onClick={() => setEditingId(node.id)}>
              {node.text === '' ? '（空）' : node.text}
            </button>
          )}
          <button type="button" className="mm-op" aria-label="添加子节点" onClick={() => addChild(node)}>
            ＋
          </button>
          {depth > 0 && (
            <button type="button" className="mm-op mm-op-del" aria-label="删除节点" onClick={() => deleteOne(node)}>
              ✕
            </button>
          )}
        </div>
        {!node.collapsed && node.children.length > 0 && (
          <div className="mm-children" style={{ borderLeftColor: fillAt(theme.branchColorByLevel, depth) }}>
            {node.children.map((c) => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mm-canvas" style={{ background: theme.background }}>
      {renderNode(doc.root, 0)}
    </div>
  )
}
