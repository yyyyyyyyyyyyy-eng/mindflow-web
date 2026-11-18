import { useEffect, useState } from 'react'
import type { DocMeta, StorageAdapter } from '../types'
import BottomSheet from './BottomSheet'

/**
 * 文档列表底部抽屉（契约 §7.1：文件列表在小屏折叠为底部抽屉）。
 * 打开时从存储拉取最新 DocMeta 列表；点选即打开/切换文档。
 */

interface DocListSheetProps {
  adapter: StorageAdapter
  open: boolean
  activeId: string
  onClose: () => void
  /** 点选文档：已打开则切换标签，未打开则新开标签（由 App.openDoc 统一处理） */
  onOpenDoc: (id: string) => void
}

export default function DocListSheet({ adapter, open, activeId, onClose, onOpenDoc }: DocListSheetProps) {
  const [metas, setMetas] = useState<DocMeta[] | null>(null)

  // 每次打开都重新拉取（文档可能在编辑中标题已变）
  useEffect(() => {
    if (!open) return
    setMetas(null)
    void adapter.list().then(setMetas)
  }, [open, adapter])

  return (
    <BottomSheet open={open} title="文档" onClose={onClose}>
      {metas === null ? (
        <p className="panel-hint">加载中…</p>
      ) : metas.length === 0 ? (
        <p className="panel-hint">暂无文档</p>
      ) : (
        <div className="sheet-docs">
          {metas.map((m) => (
            <button
              type="button"
              key={m.id}
              className={`sheet-doc ${m.id === activeId ? 'sheet-doc-active' : ''}`}
              onClick={() => {
                onOpenDoc(m.id)
                onClose()
              }}
            >
              <span className="doc-title">{m.title === '' ? '（空）' : m.title}</span>
              <span className="doc-meta">{m.nodeCount} 节点</span>
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
