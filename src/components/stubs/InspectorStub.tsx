import { useState } from 'react'
import type { DocNode, NodeStyle } from '../../types'

/**
 * Inspector stub 组件 —— 契约 §7 同 props 签名。
 *
 * TODO(mindflow-ui)：将来整体替换为 mindflow-ui 真实样式检查器，调用处零改动。
 * 通过 onNodeChange(patch) 提交 Partial<DocNode>，由编辑页应用到选中节点。
 * 契约 §7.1：本组件不依赖 hover 语义，触控目标 ≥ 44px。
 */

interface InspectorProps {
  node: DocNode
  onNodeChange: (patch: Partial<DocNode>) => void
}

/** 预置图标 id（与契约 §2 icons 字段的示例约定一致） */
const PRESET_ICONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'priority-1', label: '优先级 1' },
  { id: 'priority-2', label: '优先级 2' },
  { id: 'priority-3', label: '优先级 3' },
  { id: 'star', label: '星标' },
]

const SHAPES: ReadonlyArray<NodeStyle['shape']> = ['rounded-rect', 'rect', 'ellipse', 'underline', 'diamond']

export default function InspectorStub({ node, onNodeChange }: InspectorProps) {
  const [labelDraft, setLabelDraft] = useState('')

  /** 修改节点样式的局部字段（其余 style 字段保留） */
  const patchStyle = (patch: Partial<NodeStyle>): void => {
    onNodeChange({ style: { ...node.style, ...patch } })
  }

  /** 切换预置图标 */
  const toggleIcon = (icon: string): void => {
    const icons = node.icons ?? []
    const next = icons.includes(icon) ? icons.filter((i) => i !== icon) : [...icons, icon]
    onNodeChange({ icons: next })
  }

  /** 追加文字标签 */
  const addLabel = (): void => {
    const text = labelDraft.trim()
    if (text === '') return
    onNodeChange({ labels: [...(node.labels ?? []), text] })
    setLabelDraft('')
  }

  /** 删除指定下标的文字标签 */
  const removeLabel = (index: number): void => {
    onNodeChange({ labels: (node.labels ?? []).filter((_, i) => i !== index) })
  }

  return (
    <div className="inspector">
      <h3 className="panel-title">节点样式</h3>
      <p className="panel-hint">正在编辑：{node.text === '' ? '（空节点）' : node.text}</p>

      <div className="insp-grid">
        <label className="insp-field">
          填充色
          <input
            type="color"
            value={node.style?.fill ?? '#ffffff'}
            onChange={(e) => patchStyle({ fill: e.target.value })}
          />
        </label>
        <label className="insp-field">
          文字色
          <input
            type="color"
            value={node.style?.textColor ?? '#1f2329'}
            onChange={(e) => patchStyle({ textColor: e.target.value })}
          />
        </label>
        <label className="insp-field">
          形状
          <select
            value={node.style?.shape ?? 'rounded-rect'}
            onChange={(e) => patchStyle({ shape: e.target.value as NodeStyle['shape'] })}
          >
            {SHAPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="insp-field">
          字号
          <input
            type="number"
            min={10}
            max={48}
            value={node.style?.fontSize ?? 14}
            onChange={(e) => patchStyle({ fontSize: Number(e.target.value) })}
          />
        </label>
      </div>

      <div className="insp-row">
        <button
          type="button"
          className="btn"
          aria-pressed={node.style?.fontWeight === 'bold'}
          onClick={() => patchStyle({ fontWeight: node.style?.fontWeight === 'bold' ? 'normal' : 'bold' })}
        >
          加粗 {node.style?.fontWeight === 'bold' ? '开' : '关'}
        </button>
      </div>

      <h3 className="panel-title">图标</h3>
      <div className="insp-row">
        {PRESET_ICONS.map(({ id, label }) => {
          const active = node.icons?.includes(id) ?? false
          return (
            <button
              type="button"
              key={id}
              className={`btn ${active ? 'btn-primary' : ''}`}
              aria-pressed={active}
              onClick={() => toggleIcon(id)}
            >
              {label}
            </button>
          )
        })}
      </div>

      <h3 className="panel-title">标签</h3>
      <div className="insp-row">
        {(node.labels ?? []).map((text, i) => (
          <button type="button" key={`${text}-${i}`} className="btn btn-ghost" onClick={() => removeLabel(i)}>
            {text} ✕
          </button>
        ))}
        {node.labels !== undefined && node.labels.length === 0 && (
          <span className="panel-hint">（暂无标签）</span>
        )}
      </div>
      <div className="insp-row">
        <input
          className="insp-input"
          placeholder="新标签…"
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addLabel()
          }}
          aria-label="新标签"
        />
        <button type="button" className="btn" onClick={addLabel}>
          添加标签
        </button>
      </div>

      <h3 className="panel-title">备注</h3>
      <textarea
        className="insp-note"
        placeholder="输入节点备注…"
        defaultValue={node.note ?? ''}
        onBlur={(e) => onNodeChange({ note: e.target.value === '' ? undefined : e.target.value })}
        aria-label="节点备注"
      />
    </div>
  )
}
