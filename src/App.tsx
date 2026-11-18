import { useCallback, useEffect, useState } from 'react'
import type { StorageAdapter } from './types'
import { createStorageAdapter, isMemoryFallback } from './storage/idbAdapter'
import DocumentList from './components/DocumentList'
import EditorPage from './components/EditorPage'

/** 应用视图：文档列表 / 编辑页 */
type View = 'list' | 'edit'

/**
 * 应用根组件：存储适配器生命周期 + 视图与标签页状态。
 * 标签页模型：openIds（已打开文档，顺序即标签顺序）+ activeId（当前编辑文档）。
 */
export default function App() {
  const [adapter, setAdapter] = useState<StorageAdapter | null>(null)
  const [view, setView] = useState<View>('list')
  const [openIds, setOpenIds] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  // 启动时创建存储适配器（IndexedDB，必要时降级内存）
  useEffect(() => {
    void createStorageAdapter().then(setAdapter)
  }, [])

  /** 列表页：打开（或切换到）某文档的编辑标签 */
  const openDoc = useCallback((id: string): void => {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setActiveId(id)
    setView('edit')
  }, [])

  /** 关闭标签：若关闭的是当前标签，则激活相邻标签或回列表 */
  const closeTab = useCallback((id: string): void => {
    setOpenIds((prev) => {
      const idx = prev.indexOf(id)
      const next = prev.filter((x) => x !== id)
      setActiveId((cur) => {
        if (cur !== id) return cur
        const fallback = next[Math.min(Math.max(idx - 1, 0), next.length - 1)] ?? null
        if (fallback === null) setView('list')
        return fallback
      })
      return next
    })
  }, [])

  /** 编辑页发现文档不存在（存储中已被删除）：直接关掉该标签 */
  const handleDocMissing = useCallback(
    (id: string): void => {
      window.alert('该文档已不存在（可能已被删除）。')
      closeTab(id)
    },
    [closeTab],
  )

  if (adapter === null) {
    return <div className="app-loading">正在打开 MindFlow…</div>
  }

  return (
    <>
      {isMemoryFallback() && (
        <div className="storage-warning" role="alert">
          当前浏览器环境不支持持久化存储，数据仅保存在内存中，请及时导出 .mflow 备份。
        </div>
      )}
      {view === 'edit' && activeId !== null ? (
        <EditorPage
          adapter={adapter}
          openIds={openIds}
          activeId={activeId}
          onSelectTab={setActiveId}
          onCloseTab={closeTab}
          onBackToList={() => setView('list')}
          onDocMissing={handleDocMissing}
        />
      ) : (
        <DocumentList adapter={adapter} onOpenDoc={openDoc} />
      )}
    </>
  )
}
