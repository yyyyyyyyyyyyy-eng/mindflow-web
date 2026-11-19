/**
 * DocumentService 临时实现 —— 契约 §6 签名的本地版本。
 *
 * TODO(mindflow-core)：本文件将来由 `mindflow-core` 包的 createDocumentService
 * 整体替换（导入替换 + 删除本文件即可，调用方零改动）。
 *
 * 实现要点：
 * - update：Immer 不可变更新 → 入 undo 栈 → 触发订阅 → 计划 2s 防抖自动保存；
 * - undo/redo：无限快照栈（DEV_PLAN 要求；快照经 Immer 结构共享，内存成本可控）；
 * - flushSave：立即落盘（App 层在 visibilitychange / beforeunload 时调用）；
 * - title = root.text 镜像由 StorageAdapter.save 兜底同步（契约 §2「保存时同步」）。
 */

import { produce } from 'immer'
import type { DocumentService, MindDoc, StorageAdapter } from '../types'

/** 自动保存防抖间隔，契约默认 2000ms */
const DEFAULT_AUTOSAVE_MS = 2000

/** 契约 §6：文档服务工厂签名（与 types.ts 声明逐字一致） */
export function createDocumentService(
  adapter: StorageAdapter,
  initial: MindDoc,
  opts?: { autosaveDebounceMs?: number },
): DocumentService {
  const autosaveMs = opts?.autosaveDebounceMs ?? DEFAULT_AUTOSAVE_MS

  let current: MindDoc = initial
  const past: MindDoc[] = []   // undo 栈（栈顶为上一版本）
  const future: MindDoc[] = []  // redo 栈
  const listeners = new Set<(doc: MindDoc) => void>()

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let dirty = false // 自上次落盘后是否有变更

  /** 通知所有订阅者当前文档 */
  const notify = (): void => {
    for (const listener of listeners) listener(current)
  }

  /** 真正执行落盘；失败仅记录不抛出（避免后台保存异常打断编辑） */
  const persist = (): void => {
    void adapter
      .save(current)
      .then(() => {
        dirty = false
      })
      .catch((err: unknown) => {
        console.error('[MindFlow] 自动保存失败：', err)
      })
  }

  /** 计划防抖自动保存（连续编辑合并为一次写盘） */
  const scheduleAutosave = (): void => {
    if (saveTimer !== null) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      persist()
    }, autosaveMs)
  }

  return {
    getDoc(): MindDoc {
      return current
    },

    update(mutator: (draft: MindDoc) => void): void {
      // Immer：有实际修改时返回新引用；mutator 直接返回替换值（编辑页 onDocChange
      // 路径）同样得到新文档。无变化时返回原引用，跳过入栈与保存。
      const candidate = produce(current, mutator)
      if (candidate === current) return
      // 内容实际变化 → 刷新 updatedAt（浅拷贝保留结构共享；undo/redo 不刷新，
      // 保留快照原时刻，见 BUG-004 修复说明）
      const next: MindDoc = { ...candidate, updatedAt: new Date().toISOString() }
      past.push(current)
      future.length = 0 // 新编辑使 redo 分支失效（标准 undo 语义）
      current = next
      dirty = true
      notify()
      scheduleAutosave()
    },

    undo(): boolean {
      const prev = past.pop()
      if (prev === undefined) return false
      future.push(current)
      current = prev
      dirty = true
      notify()
      scheduleAutosave()
      return true
    },

    redo(): boolean {
      const next = future.pop()
      if (next === undefined) return false
      past.push(current)
      current = next
      dirty = true
      notify()
      scheduleAutosave()
      return true
    },

    canUndo(): boolean {
      return past.length > 0
    },

    canRedo(): boolean {
      return future.length > 0
    },

    subscribe(listener: (doc: MindDoc) => void): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    async flushSave(): Promise<void> {
      if (saveTimer !== null) {
        clearTimeout(saveTimer)
        saveTimer = null
      }
      if (dirty) {
        await adapter.save(current)
        dirty = false
      }
    },
  }
}
