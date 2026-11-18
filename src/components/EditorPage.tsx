import { useEffect, useRef, useState } from 'react'
import type { DocumentService, StorageAdapter } from '../types'
import { createDocumentService } from '../services/documentService'
import TabBar, { type TabInfo } from './TabBar'
import ActiveDocPane from './ActiveDocPane'

/**
 * 编辑页（交付清单第 5 项）：多文档标签栏 + 画布/大纲编辑区。
 *
 * 职责：
 * - 每个打开的文档一个 DocumentService 实例（undo 栈随标签保留，切换不丢）；
 * - 切走标签 / 页面隐藏（visibilitychange）/ 卸载（pagehide、unmount）时
 *   调用 flushSave 立即落盘（契约 §6 语义）；
 * - 关闭标签时先落盘再销毁该文档的编辑会话。
 */

interface EditorPageProps {
  adapter: StorageAdapter
  /** 已打开的文档 id 列表（顺序即标签顺序） */
  openIds: string[]
  /** 当前激活的文档 id */
  activeId: string
  onSelectTab: (id: string) => void
  /** 关闭标签（EditorPage 已完成落盘后回调） */
  onCloseTab: (id: string) => void
  /** 返回文档列表 */
  onBackToList: () => void
  /** 文档在存储中已不存在（如被其他端删除）时回调 */
  onDocMissing: (id: string) => void
}

export default function EditorPage({
  adapter,
  openIds,
  activeId,
  onSelectTab,
  onCloseTab,
  onBackToList,
  onDocMissing,
}: EditorPageProps) {
  // 每个文档的编辑会话（service）与标题镜像
  const servicesRef = useRef(new Map<string, DocumentService>())
  const titleByIdRef = useRef(new Map<string, string>())
  const [activeService, setActiveService] = useState<DocumentService | null>(null)

  // 标题变化时同步到标签栏数据源（ActiveDocPane 上报）
  const syncTitle = (docId: string, title: string): void => {
    titleByIdRef.current.set(docId, title)
  }

  // 落盘监听：页面隐藏/卸载时 flush 所有活跃会话。
  // 说明：beforeunload 中 async IndexedDB 写入不可靠，故同时挂
  // visibilitychange(hidden) 与 pagehide（后者在 bfcache 场景更可靠）；
  // 常规路径有 2s 防抖自动保存兜底。
  useEffect(() => {
    const flushAll = (): void => {
      for (const svc of servicesRef.current.values()) void svc.flushSave()
    }
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') flushAll()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flushAll)
    return () => {
      flushAll()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flushAll)
    }
  }, [])

  // 激活文档变化：取缓存会话或从存储加载并创建会话
  useEffect(() => {
    let cancelled = false
    setActiveService(null)
    const ensure = async (): Promise<void> => {
      const cached = servicesRef.current.get(activeId)
      if (cached !== undefined) {
        setActiveService(cached)
        return
      }
      const doc = await adapter.load(activeId)
      if (cancelled) return
      if (doc === null) {
        onDocMissing(activeId)
        return
      }
      const svc = createDocumentService(adapter, doc)
      servicesRef.current.set(activeId, svc)
      titleByIdRef.current.set(activeId, doc.title)
      setActiveService(svc)
    }
    void ensure()
    return () => {
      cancelled = true
    }
  }, [activeId, adapter, onDocMissing])

  // 切走当前标签前先落盘；关闭标签则落盘并销毁会话（undo 栈释放）
  const handleSelectTab = (id: string): void => {
    if (id !== activeId) {
      const svc = servicesRef.current.get(activeId)
      if (svc !== undefined) void svc.flushSave()
      onSelectTab(id)
    }
  }

  const handleCloseTab = (id: string): void => {
    const svc = servicesRef.current.get(id)
    if (svc !== undefined) {
      void svc.flushSave()
      servicesRef.current.delete(id)
    }
    onCloseTab(id)
  }

  const tabs: TabInfo[] = openIds.map((id) => ({
    id,
    title: titleByIdRef.current.get(id) ?? '…',
  }))

  return (
    <div className="editor-page">
      <TabBar
        tabs={tabs}
        activeId={activeId}
        onSelect={handleSelectTab}
        onClose={handleCloseTab}
        onBack={onBackToList}
      />
      {activeService === null ? (
        <div className="app-loading">载入中…</div>
      ) : (
        <ActiveDocPane key={activeId} service={activeService} onTitleSync={syncTitle} />
      )}
    </div>
  )
}
