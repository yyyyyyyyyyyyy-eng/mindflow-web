import type { DocNode } from '../types'

/**
 * 树结构通用辅助函数（纯逻辑，无 DOM 依赖）
 * 说明：复杂的不可变树更新由 Immer 在 DocumentService 中完成，此处只放只读工具。
 */

/** 统计子树节点总数（含根节点本身；与文档列表「节点数」口径一致） */
export function countNodes(node: DocNode): number {
  let total = 1
  for (const child of node.children) {
    total += countNodes(child)
  }
  return total
}
