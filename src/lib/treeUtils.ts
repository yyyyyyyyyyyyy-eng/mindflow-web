import type { DocNode, NodeId } from '../types'

/**
 * 树结构通用辅助函数（纯逻辑，无 DOM 依赖）。
 * 查找/移除类函数既可用于只读场景，也可在 Immer draft 上原地调用
 * （draft 节点可直接可变修改，由 produce 产出不可变结果）。
 */

/** 统计子树节点总数（含根节点本身；与文档列表「节点数」口径一致） */
export function countNodes(node: DocNode): number {
  let total = 1
  for (const child of node.children) {
    total += countNodes(child)
  }
  return total
}

/** 深度优先查找指定 id 的节点（找不到返回 null） */
export function findNode(node: DocNode, id: NodeId): DocNode | null {
  if (node.id === id) return node
  for (const child of node.children) {
    const hit = findNode(child, id)
    if (hit !== null) return hit
  }
  return null
}

/** 查找指定 id 节点的父节点（根节点或不存在时返回 null） */
export function findParent(node: DocNode, id: NodeId): DocNode | null {
  for (const child of node.children) {
    if (child.id === id) return node
    const hit = findParent(child, id)
    if (hit !== null) return hit
  }
  return null
}

/** 从树中移除指定 id 的节点（在其父的 children 中删除），返回是否真正移除 */
export function removeNode(node: DocNode, id: NodeId): boolean {
  const idx = node.children.findIndex((c) => c.id === id)
  if (idx !== -1) {
    node.children.splice(idx, 1)
    return true
  }
  return node.children.some((child) => removeNode(child, id))
}
