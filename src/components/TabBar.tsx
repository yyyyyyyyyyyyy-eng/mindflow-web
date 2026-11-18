import type { ReactNode } from 'react'

/** 标签页元信息（id + 显示标题） */
export interface TabInfo {
  id: string
  title: string
}

interface TabBarProps {
  tabs: TabInfo[]
  activeId: string
  /** 切换到指定文档标签 */
  onSelect: (id: string) => void
  /** 关闭指定标签 */
  onClose: (id: string) => void
  /** 返回文档列表 */
  onBack: () => void
  /** 右侧额外操作区（如小屏的「文档」抽屉按钮），可选 */
  actions?: ReactNode
}

/**
 * 编辑页顶部多文档标签栏（交付清单第 5 项）。
 * 契约 §7.1：触控目标 ≥ 44px；小屏下标签区横向滚动。
 */
export default function TabBar({ tabs, activeId, onSelect, onClose, onBack, actions }: TabBarProps) {
  return (
    <div className="tabbar" role="tablist">
      <button type="button" className="btn btn-ghost tab-back" aria-label="返回文档列表" onClick={onBack}>
        ← 列表
      </button>
      {actions}
      <div className="tab-scroll">
        {tabs.map((tab) => {
          const active = tab.id === activeId
          return (
            <div key={tab.id} className={`tab ${active ? 'tab-active' : ''}`} role="tab" aria-selected={active}>
              <button type="button" className="tab-btn" onClick={() => onSelect(tab.id)} title={tab.title}>
                {tab.title === '' ? '（空）' : tab.title}
              </button>
              <button type="button" className="tab-close" aria-label="关闭标签" onClick={() => onClose(tab.id)}>
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
