import { useCallback, useEffect, useState } from 'react'
import type { DocNode, DocumentService, MindDoc } from '../types'
import { useDocument } from '../hooks/useDocument'
import { useIsMobile } from '../hooks/useIsMobile'
import { findNode } from '../lib/treeUtils'
import { saveMflowFile } from '../lib/mflowFile'
import MindMapCanvasStub from './stubs/MindMapCanvasStub'
import OutlineViewStub from './stubs/OutlineViewStub'
import InspectorStub from './stubs/InspectorStub'
import ThemeGalleryStub from './stubs/ThemeGalleryStub'
import { BUILTIN_THEMES } from './stubs/builtinThemes'
import BottomSheet from './BottomSheet'

/**
 * 当前文档编辑区：工具栏 + 画布/大纲切换 + 检查器/主题库侧栏。
 * stub 组件经 onDocChange / onNodeChange / onSelect 全部走 DocumentService.update
 * 真实修改文档——将来替换 mindflow-ui 真组件时本组件调用处零改动。
 */

interface ActiveDocPaneProps {
  service: DocumentService
  /** 标题变化上报（供标签栏显示） */
  onTitleSync: (docId: string, title: string) => void
}

type ViewMode = 'canvas' | 'outline'

export default function ActiveDocPane({ service, onTitleSync }: ActiveDocPaneProps) {
  const doc = useDocument(service)
  // 契约 §7.1：小屏时检查器/主题库折叠为底部抽屉，大纲为默认编辑入口
  const isMobile = useIsMobile()
  // 小屏抽屉：当前打开的面板
  const [sheet, setSheet] = useState<'inspector' | 'themes' | null>(null)

  // 视图模式：小屏默认大纲（契约 §7.1：大纲视图为小屏主编辑入口）
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    window.matchMedia('(max-width: 767px)').matches ? 'outline' : 'canvas',
  )
  // 检查器编辑的目标节点（stub 阶段默认根节点；契约 §7 未定义选中通信，
  // 已在交付摘要中建议主对话补充 selectedId / onSelectNode props）
  const [selectedId] = useState<string>(() => service.getDoc().root.id)
  const [showPanel, setShowPanel] = useState(true)

  // 标题镜像变化 → 上报标签栏（root.text 即 title 的镜像源，契约 §2）
  useEffect(() => {
    onTitleSync(doc.id, doc.root.text)
  }, [doc.id, doc.root.text, onTitleSync])

  // 撤销/重做快捷键（macOS：Cmd+Z / Cmd+Shift+Z；Windows/Linux：Ctrl 同理）
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) service.redo()
        else service.undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [service])

  /** stub 组件的文档变更入口：以整体替换走一次 update（Immer recipe 返回替换值） */
  const handleDocChange = useCallback(
    (next: MindDoc): void => {
      service.update(() => next)
    },
    [service],
  )

  /** 检查器 patch：应用到选中节点（Object.assign 合并，undefined 字段即清除） */
  const handleNodeChange = useCallback(
    (patch: Partial<DocNode>): void => {
      service.update((d) => {
        const target = findNode(d.root, selectedId)
        if (target !== null) Object.assign(target, patch)
      })
    },
    [service, selectedId],
  )

  /** 主题切换：写入 doc.theme */
  const handleSelectTheme = useCallback(
    (themeId: string): void => {
      service.update((d) => {
        d.theme = themeId
      })
    },
    [service],
  )

  /** 导出 .mflow：优先 File System Access API，降级 Blob 下载；用户取消静默 */
  const handleExport = useCallback(async (): Promise<void> => {
    try {
      await saveMflowFile(doc)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      window.alert(`导出失败：${String(err)}`)
    }
  }, [doc])

  // 选中节点不存在时回退根节点（防御式）
  const selectedNode = findNode(doc.root, selectedId) ?? doc.root

  return (
    <div className="editor-body">
      <div className="editor-toolbar">
        <button
          type="button"
          className="btn"
          disabled={!service.canUndo()}
          onClick={() => service.undo()}
        >
          撤销
        </button>
        <button
          type="button"
          className="btn"
          disabled={!service.canRedo()}
          onClick={() => service.redo()}
        >
          重做
        </button>
        <div className="seg" role="group" aria-label="视图切换">
          <button
            type="button"
            className={`seg-btn ${viewMode === 'canvas' ? 'seg-on' : ''}`}
            aria-pressed={viewMode === 'canvas'}
            onClick={() => setViewMode('canvas')}
          >
            画布
          </button>
          <button
            type="button"
            className={`seg-btn ${viewMode === 'outline' ? 'seg-on' : ''}`}
            aria-pressed={viewMode === 'outline'}
            onClick={() => setViewMode('outline')}
          >
            大纲
          </button>
        </div>
        <span className="toolbar-spacer" />
        <button type="button" className="btn" onClick={() => void handleExport()}>
          导出 .mflow
        </button>
        {isMobile ? (
          <>
            <button type="button" className="btn" aria-label="节点样式" onClick={() => setSheet('inspector')}>
              样式
            </button>
            <button type="button" className="btn" aria-label="主题库" onClick={() => setSheet('themes')}>
              主题
            </button>
          </>
        ) : (
          <button type="button" className="btn" onClick={() => setShowPanel((v) => !v)}>
            {showPanel ? '隐藏面板' : '样式面板'}
          </button>
        )}
        {/* 选中节点信息（stub 阶段固定为根节点） */}
        <span className="panel-hint">选中：{selectedNode.text === '' ? '（空）' : selectedNode.text}</span>
      </div>

      <div className="editor-main">
        <div className="editor-primary">
          {viewMode === 'canvas' ? (
            <MindMapCanvasStub doc={doc} onDocChange={handleDocChange} />
          ) : (
            <OutlineViewStub doc={doc} onDocChange={handleDocChange} />
          )}
        </div>
        {!isMobile && showPanel && (
          <aside className="editor-side">
            <InspectorStub node={selectedNode} onNodeChange={handleNodeChange} />
            <ThemeGalleryStub
              themes={BUILTIN_THEMES}
              current={doc.theme}
              onSelect={handleSelectTheme}
            />
          </aside>
        )}
      </div>

      {/* 契约 §7.1：小屏检查器/主题库折叠为底部抽屉 */}
      <BottomSheet open={sheet === 'inspector'} title="节点样式" onClose={() => setSheet(null)}>
        <InspectorStub node={selectedNode} onNodeChange={handleNodeChange} />
      </BottomSheet>
      <BottomSheet open={sheet === 'themes'} title="主题库" onClose={() => setSheet(null)}>
        <ThemeGalleryStub themes={BUILTIN_THEMES} current={doc.theme} onSelect={handleSelectTheme} />
      </BottomSheet>
    </div>
  )
}
