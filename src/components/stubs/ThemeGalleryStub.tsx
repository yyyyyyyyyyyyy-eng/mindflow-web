import type { Theme } from '../../types'

/**
 * ThemeGallery stub 组件 —— 契约 §7 同 props 签名。
 *
 * TODO(mindflow-ui)：将来整体替换为 mindflow-ui 真实主题库，调用处零改动。
 * 通过 onSelect(themeId) 上报主题切换，由编辑页写入 doc.theme。
 * 契约 §7.1：卡片不依赖 hover 语义，触控目标 ≥ 44px。
 */

interface ThemeGalleryProps {
  themes: Theme[]
  current: string
  onSelect: (themeId: string) => void
}

export default function ThemeGalleryStub({ themes, current, onSelect }: ThemeGalleryProps) {
  return (
    <div className="theme-gallery">
      <h3 className="panel-title">主题库</h3>
      <div className="theme-grid">
        {themes.map((theme) => {
          const active = theme.id === current
          return (
            <button
              type="button"
              key={theme.id}
              className={`theme-card ${active ? 'theme-card-active' : ''}`}
              aria-pressed={active}
              onClick={() => onSelect(theme.id)}
            >
              <span className="theme-name">{theme.name}</span>
              <span
                className="theme-swatch"
                style={{ background: theme.background }}
                aria-hidden="true"
              >
                {[...theme.nodeFillByLevel.slice(0, 3), theme.rootStyle.fill ?? theme.nodeFillByLevel[0]].map(
                  (color, i) => (
                    <span key={i} className="theme-dot" style={{ background: color }} />
                  ),
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
