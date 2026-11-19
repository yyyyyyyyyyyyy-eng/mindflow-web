import type { MindDoc, StorageAdapter } from '../types'

/**
 * 编辑会话恢复层：页面卸载/后台前的同步快照兜底。
 *
 * 背景（BUG-005 实测）：pagehide/beforeunload 中的 async IndexedDB 写入在页面
 * 卸载时不可靠——「编辑后立即刷新」会丢失防抖窗口（默认 2s）内未落盘的编辑。
 * localStorage 写入是同步的，可在卸载前完成，作为恢复快照。
 *
 * 工作方式：
 * - EditorPage 在 visibilitychange(hidden) / pagehide / unmount 时对所有活跃
 *   会话同步写快照，flushSave 成功后清除；
 * - 应用启动时消费快照：比 IndexedDB 中 updatedAt 更新（或存储无此文档）则
 *   覆盖落盘恢复，随后删除快照；
 * - 防抖保存正常完成的场景下快照会被跳过（updatedAt 比较），不影响主链路。
 *
 * TODO：本层属于网页壳层职责，mindflow-core 替换 DocumentService 时保留。
 */

const RECOVERY_PREFIX = 'mindflow-recovery-'

/** localStorage 恢复快照结构 */
interface RecoveryEntry {
  doc: MindDoc
  /** 快照写入时刻（ISO 8601），用于与存储中的 updatedAt 比较新旧 */
  at: string
}

/** 同步写恢复快照（容量超限等异常时静默跳过：防抖保存仍在工作） */
export function writeRecoverySnapshot(doc: MindDoc): void {
  const entry: RecoveryEntry = { doc, at: new Date().toISOString() }
  try {
    localStorage.setItem(RECOVERY_PREFIX + doc.id, JSON.stringify(entry))
  } catch {
    // localStorage 容量满 / 隐私模式：尽力而为，跳过
  }
}

/** 快照对应文档落盘成功后清除 */
export function clearRecoverySnapshot(docId: string): void {
  try {
    localStorage.removeItem(RECOVERY_PREFIX + docId)
  } catch {
    // 忽略
  }
}

/**
 * 启动时消费全部恢复快照：快照比存储中的 updatedAt 新（或存储无此文档）则
 * 覆盖保存；随后一律删除（避免每次启动重复尝试）。
 * 返回恢复的文档数量。
 */
export async function consumeRecoverySnapshots(adapter: StorageAdapter): Promise<number> {
  let recovered = 0
  const keys: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key !== null && key.startsWith(RECOVERY_PREFIX)) keys.push(key)
    }
  } catch {
    return 0
  }

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) continue
      const entry = JSON.parse(raw) as RecoveryEntry
      if (typeof entry?.doc?.id !== 'string') continue
      const stored = await adapter.load(entry.doc.id)
      if (stored === null || Date.parse(entry.at) > Date.parse(stored.updatedAt)) {
        await adapter.save(entry.doc)
        recovered++
      }
    } catch {
      // 单条恢复失败：跳过（以 IndexedDB 现有数据为准）
    } finally {
      try {
        localStorage.removeItem(key)
      } catch {
        // 忽略
      }
    }
  }
  return recovered
}
