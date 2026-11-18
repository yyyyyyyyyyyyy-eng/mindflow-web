import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DocMeta, MindDoc, StorageAdapter } from '../types'
import { countNodes } from '../lib/treeUtils'

/**
 * StorageAdapter 的 IndexedDB 实现（契约 §6）。
 *
 * 布局（契约 §6）：db 名 `mindflow`，object store 名 `docs`，keyPath = `id`。
 * 设计要点：
 * - save() 兜底同步 title = root.text 镜像（契约 §2「保存时同步」的落盘侧保证）；
 * - list() 为拿到实时 nodeCount 需读全量文档（单档 <50MB 口径下可接受，
 *   后续文档多时可增设 meta 镜像 store 优化——已记入交付摘要遗留问题）；
 * - Safari 隐私模式等 IndexedDB 不可用场景，降级为内存实现（DEV_PLAN 排障表要求），
 *   刷新即失，UI 层可通过 isMemoryFallback() 提示用户及时导出 .mflow。
 */

const DB_NAME = 'mindflow'
const DB_VERSION = 1
const STORE_DOCS = 'docs'

/** idb 的强类型 schema：docs store 主键为文档 id，值为完整 MindDoc */
interface MindflowDB extends DBSchema {
  docs: {
    key: string
    value: MindDoc
  }
}

/** 模块级连接单例：避免每次操作重开数据库 */
let dbPromise: Promise<IDBPDatabase<MindflowDB>> | null = null

function getDB(): Promise<IDBPDatabase<MindflowDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MindflowDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 首次建库（或版本升级）：创建文档主存
        if (!db.objectStoreNames.contains(STORE_DOCS)) {
          db.createObjectStore(STORE_DOCS, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

/** 内存降级实现：与 IndexedDB 版同接口，刷新即失 */
class MemoryStorage implements StorageAdapter {
  private docs = new Map<string, MindDoc>()

  async list(): Promise<DocMeta[]> {
    const metas = [...this.docs.values()].map((doc) => ({
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updatedAt,
      nodeCount: countNodes(doc.root),
    }))
    return sortByUpdatedAtDesc(metas)
  }

  async load(id: string): Promise<MindDoc | null> {
    return this.docs.get(id) ?? null
  }

  async save(doc: MindDoc): Promise<void> {
    this.docs.set(doc.id, syncTitleMirror(doc))
  }

  async delete(id: string): Promise<void> {
    this.docs.delete(id)
  }
}

/** DocMeta 按更新时间降序（ISO 8601 同格式字符串字典序 = 时间序） */
function sortByUpdatedAtDesc(metas: DocMeta[]): DocMeta[] {
  return metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** 保存前兜底同步 title 镜像；已一致时原样返回，不污染调用方对象 */
function syncTitleMirror(doc: MindDoc): MindDoc {
  return doc.title === doc.root.text ? doc : { ...doc, title: doc.root.text }
}

/** IndexedDB 版适配器（契约 §6 签名） */
const idbAdapter: StorageAdapter = {
  async list(): Promise<DocMeta[]> {
    const db = await getDB()
    const docs = await db.getAll(STORE_DOCS)
    const metas = docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updatedAt,
      nodeCount: countNodes(doc.root),
    }))
    return sortByUpdatedAtDesc(metas)
  },

  async load(id: string): Promise<MindDoc | null> {
    const db = await getDB()
    const doc = await db.get(STORE_DOCS, id)
    return doc ?? null
  },

  async save(doc: MindDoc): Promise<void> {
    const db = await getDB()
    // 契约 §2：title = root.text 镜像，保存时同步
    await db.put(STORE_DOCS, syncTitleMirror(doc))
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete(STORE_DOCS, id)
  },
}

/** 是否已降级为内存存储（Safari 隐私模式等场景） */
let memoryFallback = false

export function isMemoryFallback(): boolean {
  return memoryFallback
}

/**
 * 创建存储适配器：优先 IndexedDB，异常（如隐私模式写入受限）时降级内存实现。
 * 应用启动时调用一次；TODO(mindflow-core)：此工厂与降级逻辑属于网页壳层职责，
 * 将来 core 包发布后仅保留接口导入。
 */
export async function createStorageAdapter(): Promise<StorageAdapter> {
  try {
    if (typeof indexedDB === 'undefined') {
      throw new Error('当前环境无 IndexedDB')
    }
    await getDB() // 预热连接，尽早暴露不可用错误
    return idbAdapter
  } catch {
    memoryFallback = true
    console.warn('[MindFlow] IndexedDB 不可用，已降级为内存存储（刷新后数据将丢失，请及时导出 .mflow）')
    return new MemoryStorage()
  }
}
