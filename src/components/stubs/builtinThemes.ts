import type { Theme } from '../../types'

/**
 * 内置主题占位数据（契约 §5 首批 6 个主题 id）。
 *
 * TODO(mindflow-ui)：主题数据将来由 mindflow-ui 包提供（权威定义在桌面仓库），
 * 此处仅为 stub 阶段的占位实现，供 ThemeGallery 展示与文档 theme 字段切换使用。
 */

export const BUILTIN_THEMES: Theme[] = [
  {
    id: 'classic',
    name: '经典',
    background: '#ffffff',
    nodeFillByLevel: ['#4f7cf7', '#7ea6f4', '#a8c4f8', '#cddcfb'],
    branchColorByLevel: ['#4f7cf7', '#9db9f5', '#c3d4fa', '#e2e9fc'],
    textColor: '#1f2329',
    rootStyle: { fill: '#4f7cf7', textColor: '#ffffff', shape: 'rounded-rect', fontWeight: 'bold' },
  },
  {
    id: 'snow-ink',
    name: '墨雪',
    background: '#f7f8fa',
    nodeFillByLevel: ['#2b2f36', '#565b64', '#8a8f98', '#b8bcc4'],
    branchColorByLevel: ['#2b2f36', '#565b64', '#8a8f98', '#b8bcc4'],
    textColor: '#1f2329',
    rootStyle: { fill: '#1a1d21', textColor: '#ffffff', shape: 'rect', fontWeight: 'bold' },
  },
  {
    id: 'sunset',
    name: '日落',
    background: '#fff8f0',
    nodeFillByLevel: ['#e8590c', '#f08c00', '#f4a261', '#f8d3a4'],
    branchColorByLevel: ['#e8590c', '#f08c00', '#f4a261', '#f8d3a4'],
    textColor: '#3d2b1f',
    rootStyle: { fill: '#d9480f', textColor: '#ffffff', shape: 'rounded-rect', fontWeight: 'bold' },
  },
  {
    id: 'forest',
    name: '森林',
    background: '#f3f7f1',
    nodeFillByLevel: ['#2b8a3e', '#69b578', '#a3cfa0', '#d3e8d1'],
    branchColorByLevel: ['#2b8a3e', '#69b578', '#a3cfa0', '#d3e8d1'],
    textColor: '#1f2d22',
    rootStyle: { fill: '#2b8a3e', textColor: '#ffffff', shape: 'rounded-rect', fontWeight: 'bold' },
  },
  {
    id: 'ocean',
    name: '海洋',
    background: '#f0f7fa',
    nodeFillByLevel: ['#1971c2', '#4dabf7', '#82c7f9', '#c1e5fb'],
    branchColorByLevel: ['#1971c2', '#4dabf7', '#82c7f9', '#c1e5fb'],
    textColor: '#12222e',
    rootStyle: { fill: '#1864ab', textColor: '#ffffff', shape: 'ellipse', fontWeight: 'bold' },
  },
  {
    id: 'mono-dark',
    name: '暗夜',
    background: '#1e2227',
    nodeFillByLevel: ['#2e3338', '#3d434a', '#545b63', '#6e767f'],
    branchColorByLevel: ['#6e767f', '#545b63', '#3d434a', '#2e3338'],
    textColor: '#e8eaed',
    rootStyle: { fill: '#e8eaed', textColor: '#1e2227', shape: 'rounded-rect', fontWeight: 'bold' },
  },
]

/** 按 id 取主题；未知 id 回退经典主题（防御式，文档 theme 字段可能被外部写入） */
export function getTheme(id: string): Theme {
  return BUILTIN_THEMES.find((t) => t.id === id) ?? BUILTIN_THEMES[0]
}
