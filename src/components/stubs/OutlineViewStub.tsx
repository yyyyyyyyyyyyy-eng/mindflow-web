import { useState, type JSX } from 'react'
import { nanoid } from 'nanoid'
import { produce } from 'immer'
import type { DocNode, MindDoc } from '../../types'
import { findNode, findParent, removeNode } from '../../lib/treeUtils'

/**
 * OutlineView stub 组件 —— 契约 §7 同 props 签名。
 *
 * TODO(mindflow-ui)：将来整体替换为 mindflow-ui 真实大纲视图，调用处零改动。
 * 本 stub 通过 onDocChange 真实修改文档：
 * - 行内文本编辑（点击进入，blur/Enter 提交）；
 * - 添加子节点 / 添加兄弟节点 / 删除；
 * - 折叠展开。
 * 契约 §7.1：移动端大纲视图是主编辑入口，本组件同样服务 <768px 场景。
 */

interface OutlineViewProps {
  doc: MindDoc
  onDocChange: (next: MindDoc) => void
}

export default function OutlineViewStub({ doc, onDocChange }: OutlineViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  /** 提交节点文本 */
  const commitText = (node: DocNode, text: string): void => {
    if (text === node.text) return
    onDocChange(
      produce(doc, (d) => {
        const target = findNode(d.root, node.id)
        if (target !== null) target.text = text
      }),
    )
  }

  /** 添加子节点并进入编辑 */
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

  /** 添加兄弟节点（插到当前节点之后），根节点不适用 */
  const addSibling = (node: DocNode): void => {
    const sibling: DocNode = { id: nanoid(), text: '', children: [] }
    onDocChange(
      produce(doc, (d) => {
        const parent = findParent(d.root, node.id)
        if (parent !== null) {
          const idx = parent.children.findIndex((c) => c.id === node.id)
          parent.children.splice(idx + 1, 0, { ...sibling })
        }
      }),
    )
    setEditingId(sibling.id)
  }

  /** 删除节点 */
  const deleteOne = (node: DocNode): void => {
    onDocChange(
      produce(doc, (d) => {
        removeNode(d.root, node.id)
      }),
    )
  }

  /** 折叠展开 */
  const toggleCollapsed = (node: DocNode): void => {
    onDocChange(
      produce(doc, (d) => {
        const target = findNode(d.root, node.id)
        if (target !== null) target.collapsed = !target.collapsed
      }),
    )
  }

  /** 渲染大纲行与子树（缩进按深度） */
  const renderRow = (node: DocNode, depth: number): JSX.Element => {
    const hasChildren = node.children.length > 0
    return (
      <div key={node.id} className="ol-group">
        <div className="ol-row" style={{ paddingLeft: 12 + depth * 24 }}>
          {hasChildren ? (
            <button
              type="button"
              className="ol-toggle"
              aria-label={node.collapsed ? '展开' : '折叠'}
              onClick={() => toggleCollapsed(node)}
            >
              {node.collapsed ? '▸' : '▾'}
            </button>
          ) : (
            <span className="ol-dot" aria-hidden="true" />
          )}
          {editingId === node.id ? (
            <input
              className="ol-edit"
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
            <button type="button" className="ol-label" onClick={() => setEditingId(node.id)}>
              {node.text === '' ? '（空）' : node.text}
            </button>
          )}
          <span className="ol-ops">
            <button type="button" className="btn btn-ghost" aria-label="添加子节点" onClick={() => addChild(node)}>
              ＋子
            </button>
            {depth > 0 && (
              <button type="button" className="btn btn-ghost" aria-label="添加兄弟节点" onClick={() => addSibling(node)}>
                ＋兄
              </button>
            )}
            {depth > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-danger"
                aria-label="删除节点"
                onClick={() => deleteOne(node)}
              >
                ✕
              </button>
            )}
          </span>
        </div>
        {!node.collapsed && node.children.map((c) => renderRow(c, depth + 1))}
      </div>
    )
  }

  return <div className="ol-view">{renderRow(doc.root, 0)}</div>
}
