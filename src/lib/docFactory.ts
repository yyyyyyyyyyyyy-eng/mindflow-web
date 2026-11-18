import { nanoid } from 'nanoid'
import type { MindDoc } from '../types'

/**
 * 文档工厂：按契约 §2「新建空文档」规范构造 MindDoc。
 * 规范：title 与 root.text = "中心主题"，structure = 'mindmap'，theme = 'classic'。
 */

export function createEmptyDoc(): MindDoc {
  const now = new Date().toISOString()
  return {
    formatVersion: 1,
    id: nanoid(),
    title: '中心主题',
    structure: 'mindmap',
    theme: 'classic',
    root: {
      id: nanoid(),
      text: '中心主题',
      children: [],
    },
    createdAt: now,
    updatedAt: now,
  }
}
