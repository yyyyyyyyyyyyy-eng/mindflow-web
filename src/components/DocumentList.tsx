import { useCallback, useEffect, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import type { DocMeta, MindDoc, StorageAdapter } from '../types'
import { createEmptyDoc } from '../lib/docFactory'
import { readMflowFile, MflowParseError } from '../lib/mflowFile'

/** 文档列表页 props：存储适配器 + 打开文档回调 */
interface DocumentListProps {
  adapter: StorageAdapter
  onOpenDoc: (id: string) => void
}

/** 更新时间本地化显示（如 2026/11/18 20:15） */
function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 文档列表页（交付清单第 4 项）：
 * 新建 / 重命名 / 删除 / 展示 DocMeta（标题、更新时间、节点数）。
 * 重命名同步修改 title 与 root.text（契约 §2：title 是 root.text 的镜像）。
 */
export default function DocumentList({ adapter, onOpenDoc }: DocumentListProps) {
  const [metas, setMetas] = useState<DocMeta[] | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')

  /** 拉取最新文档元数据列表 */
  const refresh = useCallback(async () => {
    const list = await adapter.list()
    setMetas(list)
  }, [adapter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /** 新建空白文档（契约 §2 规范）→ 刷新列表 → 进入编辑 */
  const handleCreate = async (): Promise<void> => {
    const doc = createEmptyDoc()
    await adapter.save(doc)
    await refresh()
    onOpenDoc(doc.id)
  }

  /** 确认重命名：同步 title 与 root.text，并更新 updatedAt */
  const handleRenameConfirm = async (): Promise<void> => {
    const id = renameId
    if (id === null) return
    const name = renameText.trim()
    if (name !== '') {
      const doc = await adapter.load(id)
      if (doc !== null) {
        await adapter.save({
          ...doc,
          title: name,
          root: { ...doc.root, text: name },
          updatedAt: new Date().toISOString(),
        })
      }
    }
    setRenameId(null)
    await refresh()
  }

  /** 删除文档（原生 confirm 防误触；移动端换自定义弹层属于后续打磨项） */
  const handleDelete = async (id: string, title: string): Promise<void> => {
    if (!window.confirm(`确定删除「${title}」吗？此操作不可撤销。`)) return
    await adapter.delete(id)
    await refresh()
  }

  /** 重命名输入框：Enter 确认 / Escape 取消 */
  const handleRenameKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') void handleRenameConfirm()
    if (e.key === 'Escape') setRenameId(null)
  }

  /** 导入 .mflow：FileReader 读取 + 校验（formatVersion 必须 1）；id 冲突时生成新 id 副本导入 */
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许连续导入同名文件
    if (file === undefined) return
    let doc: MindDoc
    try {
      doc = await readMflowFile(file)
    } catch (err) {
      window.alert(err instanceof MflowParseError ? err.message : `导入失败：${String(err)}`)
      return
    }
    // 防覆盖：本地已存在同 id 文档时重新生成 id（以副本形式导入）
    const existingIds = new Set((metas ?? []).map((m) => m.id))
    const final: MindDoc = existingIds.has(doc.id)
      ? { ...doc, id: nanoid(), updatedAt: new Date().toISOString() }
      : { ...doc, updatedAt: new Date().toISOString() } // 导入视为一次变更
    await adapter.save(final)
    await refresh()
    onOpenDoc(final.id)
  }
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <main className="doc-list-page">
      <header className="page-header">
        <h1 className="app-title">MindFlow</h1>
        <div className="header-actions">
          {/* 隐藏 file input：accept 限定 .mflow */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".mflow,application/json"
            className="hidden-file-input"
            onChange={(e) => void handleImportFile(e)}
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            type="button"
            className="btn"
            onClick={() => fileInputRef.current?.click()}
          >
            导入 .mflow
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void handleCreate()}>
            新建导图
          </button>
        </div>
      </header>

      {metas === null ? (
        <p className="empty-hint">加载中…</p>
      ) : metas.length === 0 ? (
        <p className="empty-hint">还没有导图，点击「新建导图」开始创作。</p>
      ) : (
        <ul className="doc-list">
          {metas.map((m) => (
            <li key={m.id} className="doc-item">
              {renameId === m.id ? (
                <div className="rename-row">
                  <input
                    className="rename-input"
                    value={renameText}
                    autoFocus
                    maxLength={100}
                    onChange={(e) => setRenameText(e.target.value)}
                    onKeyDown={handleRenameKey}
                    aria-label="新文档名"
                  />
                  <button type="button" className="btn" onClick={() => void handleRenameConfirm()}>
                    保存
                  </button>
                  <button type="button" className="btn" onClick={() => setRenameId(null)}>
                    取消
                  </button>
                </div>
              ) : (
                <>
                  <button type="button" className="doc-open" onClick={() => onOpenDoc(m.id)}>
                    <span className="doc-title">{m.title}</span>
                    <span className="doc-meta">
                      {formatTime(m.updatedAt)} · {m.nodeCount} 节点
                    </span>
                  </button>
                  <div className="doc-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setRenameId(m.id)
                        setRenameText(m.title)
                      }}
                    >
                      重命名
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-danger"
                      onClick={() => void handleDelete(m.id, m.title)}
                    >
                      删除
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
