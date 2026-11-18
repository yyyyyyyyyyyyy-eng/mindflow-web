import { useEffect, type ReactNode } from 'react'

/**
 * 底部抽屉（bottom sheet）。
 *
 * 契约 §7.1：检查器 / 主题库 / 文档列表在小屏（<768px）折叠为底部抽屉。
 * 本组件为通用容器：遮罩点击关闭、Escape 关闭、遵守 iOS 安全区。
 */

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export default function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  // Escape 关闭（open 期间才挂监听）
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="sheet-root">
      <button type="button" className="sheet-mask" aria-label="关闭抽屉" onClick={onClose} tabIndex={-1} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-header">
          <h3 className="sheet-title">{title}</h3>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
