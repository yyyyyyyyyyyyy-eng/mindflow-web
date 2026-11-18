import { useSyncExternalStore } from 'react'
import type { DocumentService, MindDoc } from '../types'

/**
 * 订阅 DocumentService 的当前文档。
 *
 * 依赖：service.subscribe 与 service.getDoc 均为稳定引用（工厂闭包产物），
 * 满足 useSyncExternalStore 对 subscribe/getSnapshot 稳定性的要求；
 * Immer 保证未变更时 getDoc 返回同一引用，不会引起多余重渲。
 */
export function useDocument(service: DocumentService): MindDoc {
  return useSyncExternalStore(service.subscribe, service.getDoc)
}
