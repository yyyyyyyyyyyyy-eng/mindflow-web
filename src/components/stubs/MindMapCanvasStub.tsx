import { useRef, useState, type JSX } from 'react'
import { nanoid } from 'nanoid'
import { produce } from 'immer'
import type { DocNode, MindDoc, NodeStyle } from '../../types'
import { findNode, removeNode } from '../../lib/treeUtils'
import { getTheme } from './builtinThemes'
import { useCanvasGestures } from './canvasGestures'

/**
 * MindMapCanvas stub 组件 —— 契约 §7 同 props 签名。
 *
 * TODO(mindflow-ui)：将来整体替换为 mindflow-ui 真实画布（React Flow 底座 +
 * mindflow-core 布局引擎），本组件删除即可，编辑页调用处零改动。
 * 本 stub 通过 onDocChange 真实修改文档，编辑行为完整可用：
 * - 节点行内文本编辑（点击进入，blur/Enter 提交——一次操作一次 onDocChange，
 *   保证 undo 栈粒度为完整的一次文本修改，而非每个按键）；
 * - 添加/删除子节点、折叠展开；
 * - 触摸手势（契约 §7.1）：pinch 缩放、双指平移、长按唤出节点操作菜单；
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

/** 长按菜单定位：clamp 到视口内 */
function clampMenuPos(x: number, y: number): { left: number; top: number } {
  const MENU_W = 168
  const MENU_H = 150
  const margin = 8
  return {
    left: Math.min(Math.max(x - MENU_W / 2, margin), window.innerWidth - MENU_W - margin),
    top: Math.min(Math.max(y, margin), window.innerHeight - MENU_H - margin),
  }
}

export default function MindMapCanvasStub({ doc, onDocChange }: MindMapCanvasProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const theme = getTheme(doc.theme)
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const { longPress, clearLongPress, consumeClickSuppress, resetView } = useCanvasGestures({
    viewportRef,
    contentRef,
  })

  /** 提交节点文本（与原文相同则不产生变更） */
  const commitText = (id: string, text: string): void => {
    onDocChange(
      produce(doc, (d) => {
        const target = findNode(d.root, id)
        if (target !== null && target.text !== text) target.text = text
      }),
    )
  }

  /** 添加子节点并直接进入其行内编辑 */
  const addChildTo = (id: string): void => {
    const child: DocNode = { id: nanoid(), text: '', children: [] }
    onDocChange(
      produce(doc, (d) => {
        const target = findNode(d.root, id)
        if (target !== null) target.children.push({ ...child })
      }),
    )
    setEditingId(child.id)
  }

  /** 删除节点（根节点由 UI 层保护） */
  const deleteOne = (id: string): void => {
    onDocChange(
      produce(doc, (d) => {
        removeNode(d.root, id)
      }),
    )
  }

  /** 折叠展开（契约 §2：collapsed=true 时布局/渲染跳过整个子树） */
  const toggleCollapsed = (id: string): void => {
    onDocChange(
      produce(doc, (d) => {
        const target = findNode(d.root, id)
        if (target !== null) target.collapsed = !target.collapsed
      }),
    )
  }

  /** 渲染单个节点与子树 */
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
        <div className="mm-node" data-node-id={node.id} style={nodeCss} data-depth={depth}>
          {hasChildren && (
            <button
              type="button"
              className="mm-toggle"
              aria-label={node.collapsed ? '展开' : '折叠'}
              onClick={() => toggleCollapsed(node.id)}
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
                commitText(node.id, e.target.value)
                setEditingId(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitText(node.id, e.currentTarget.value)
                  setEditingId(null)
                }
              }}
              aria-label="节点文本"
            />
          ) : (
            <button
              type="button"
              className="mm-label"
              onClick={() => {
                // 长按刚触发过则吞掉本次 click，避免误入行内编辑
                if (consumeClickSuppress()) return
                setEditingId(node.id)
              }}
            >
              {node.text === '' ? '（空）' : node.text}
            </button>
          )}
          <button type="button" className="mm-op" aria-label="添加子节点" onClick={() => addChildTo(node.id)}>
            ＋
          </button>
          {depth > 0 && (
            <button
              type="button"
              className="mm-op mm-op-del"
              aria-label="删除节点"
              onClick={() => deleteOne(node.id)}
            >
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
    <div className="mm-canvas-toolbar">
      <div ref={viewportRef} className="mm-viewport">
        <div ref={contentRef} className="mm-content" style={{ background: theme.background }}>
          {renderNode(doc.root, 0)}
        </div>
      </div>
      <button type="button" className="btn btn-ghost mm-reset" onClick={resetView}>
        复位视图
      </button>
      {longPress !== null && (
        <>
          <div className="lp-menu-mask" onClick={clearLongPress} aria-hidden="true" />
          <div className="lp-menu" style={clampMenuPos(longPress.x, longPress.y)} role="menu">
            <button
              type="button"
              className="lp-item"
              role="menuitem"
              onClick={() => {
                setEditingId(longPress.nodeId)
                clearLongPress()
              }}
            >
              编辑文字
            </button>
            <button
              type="button"
              className="lp-item"
              role="menuitem"
              onClick={() => {
                addChildTo(longPress.nodeId)
                clearLongPress()
              }}
            >
              添加子节点
            </button>
            {longPress.nodeId !== doc.root.id && (
              <button
                type="button"
                className="lp-item lp-item-danger"
                role="menuitem"
                onClick={() => {
                  deleteOne(longPress.nodeId)
                  clearLongPress()
                }}
              >
                删除节点
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
