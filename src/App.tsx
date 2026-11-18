import { useEffect, useState } from 'react'
import type { StorageAdapter } from './types'
import { createStorageAdapter, isMemoryFallback } from './storage/idbAdapter'
import DocumentList from './components/DocumentList'

/**
 * 应用根组件：负责存储适配器生命周期与页面视图切换。
 * TODO(REQ-006)：编辑页接入后，onOpenDoc 将切换到编辑视图。
 */
export default function App() {
  const [adapter, setAdapter] = useState<StorageAdapter | null>(null)

  // 启动时创建存储适配器（IndexedDB，必要时降级内存）
  useEffect(() => {
    void createStorageAdapter().then(setAdapter)
  }, [])

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
      {/* TODO(REQ-006)：按视图状态切换文档列表页 / 编辑页 */}
      <DocumentList adapter={adapter} onOpenDoc={() => undefined} />
    </>
  )
}
