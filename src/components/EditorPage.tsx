import { useCallback, useEffect, useRef, useState } from 'react'
import type { DocumentService, StorageAdapter } from '../types'
import { createDocumentService } from '../services/documentService'
import { useIsMobile } from '../hooks/useIsMobile'
import { writeRecoverySnapshot, clearRecoverySnapshot } from '../storage/recoverySnapshot'
import TabBar, { type TabInfo } from './TabBar'
import ActiveDocPane from './ActiveDocPane'
import DocListSheet from './DocListSheet'

/**
 * 编辑页（交付清单第 5 项）：多文档标签栏 + 画布/大纲编辑区。
 *
 * 职责：
 * - 每个打开的文档一个 DocumentService 实例（undo 栈随标签保留，切换不丢）；
 * - 切走标签 / 页面隐藏（visibilitychange）/ 卸载（pagehide、unmount）时
 *   调用 flushSave 立即落盘（契约 §6 语义）；
 * - 关闭标签时先落盘再销毁该文档的编辑会话；
 * - 小屏（<768px）时文档列表折叠为底部抽屉（契约 §7.1）。
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
  /** 从抽屉打开文档（已打开则切换，未打开则新开标签） */
  onOpenDoc: (id: string) => void
}

export default function EditorPage({
  adapter,
  openIds,
  activeId,
  onSelectTab,
  onCloseTab,
  onBackToList,
  onDocMissing,
  onOpenDoc,
}: EditorPageProps) {
  // 每个文档的编辑会话（service）；标题镜像存 state（ref 写入不会触发重渲染，
  // 曾导致根节点改名后 TabBar 标题滞后——冒烟实测发现，BUG-003）
  const servicesRef = useRef(new Map<string, DocumentService>())
  const [titleById, setTitleById] = useState<Map<string, string>>(() => new Map())
  const [activeService, setActiveService] = useState<DocumentService | null>(null)
  // 契约 §7.1：小屏文档列表折叠为底部抽屉
  const isMobile = useIsMobile()
  const [docSheetOpen, setDocSheetOpen] = useState(false)

  // 标题变化时同步到标签栏数据源（ActiveDocPane 上报；useCallback 稳定引用避免子级 effect 重跑）
  const syncTitle = useCallback((docId: string, title: string): void => {
    setTitleById((prev) => {
      if (prev.get(docId) === title) return prev
      const next = new Map(prev)
      next.set(docId, title)
      return next
    })
  }, [])

  // 落盘监听：页面隐藏/卸载时 flush 所有活跃会话。
  // 说明：beforeunload/pagehide 中 async IndexedDB 写入在卸载时不可靠（BUG-005
  // 实测会丢防抖窗口内的编辑），故先**同步**写 localStorage 恢复快照再异步落盘，
  // 启动时由 consumeRecoverySnapshots 消费恢复；常规路径有 2s 防抖保存。
  useEffect(() => {
    const flushAll = (): void => {
      for (const svc of servicesRef.current.values()) {
        const docId = svc.getDoc().id
        // 同步快照兜底（必须先于异步落盘完成）
        writeRecoverySnapshot(svc.getDoc())
        void svc
          .flushSave()
          .then(() => {
            clearRecoverySnapshot(docId)
          })
          .catch(() => {
            // 落盘失败：快照保留，下次启动由恢复层兜底
          })
      }
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
      setTitleById((prev) => {
        const next = new Map(prev)
        next.set(activeId, doc.title)
        return next
      })
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
    title: titleById.get(id) ?? '…',
  }))

  return (
    <div className="editor-page">
      <TabBar
        tabs={tabs}
        activeId={activeId}
        onSelect={handleSelectTab}
        onClose={handleCloseTab}
        onBack={onBackToList}
        actions={
          isMobile ? (
            <button
              type="button"
              className="btn btn-ghost tab-back"
              aria-label="打开文档列表抽屉"
              onClick={() => setDocSheetOpen(true)}
            >
              文档
            </button>
          ) : undefined
        }
      />
      <DocListSheet
        adapter={adapter}
        open={docSheetOpen}
        activeId={activeId}
        onClose={() => setDocSheetOpen(false)}
        onOpenDoc={onOpenDoc}
      />
      {activeService === null ? (
        <div className="app-loading">载入中…</div>
      ) : (
        <ActiveDocPane key={activeId} service={activeService} onTitleSync={syncTitle} />
      )}
    </div>
  )
}
