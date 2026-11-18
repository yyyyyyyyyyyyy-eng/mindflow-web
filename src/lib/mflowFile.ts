import type { MindDoc } from '../types'

/**
 * .mflow 文件导入导出（契约 §2：文件 = JSON.stringify(doc, null, 2)，扩展名 .mflow）。
 *
 * 导出：浏览器支持 File System Access API 时优先 showSaveFilePicker 直接写回，
 * 否则降级为 Blob + <a download> 下载。
 * 导入：FileReader 读取 + 严格 JSON 校验（formatVersion 必须为 1）。
 */

/** 结构类型白名单（契约 §2 七种） */
const STRUCTURE_TYPES: ReadonlySet<string> = new Set([
  'logic-right',
  'mindmap',
  'org-chart',
  'fishbone',
  'timeline-h',
  'timeline-v',
  'tree',
])

/** 解析/校验失败错误（附中文消息，可直接展示给用户） */
export class MflowParseError extends Error {}

/** 校验失败时抛出统一格式的错误 */
function fail(message: string): never {
  throw new MflowParseError(`.mflow 校验失败：${message}`)
}

/** 递归校验 DocNode 形状（仅类型层面，不做语义级深度检查） */
function assertDocNode(value: unknown, path: string): void {
  if (typeof value !== 'object' || value === null) fail(`${path} 必须是对象`)
  const obj = value as Record<string, unknown>
  if (typeof obj.id !== 'string' || obj.id === '') fail(`${path}.id 必须是非空字符串`)
  if (typeof obj.text !== 'string') fail(`${path}.text 必须是字符串`)
  if (!Array.isArray(obj.children)) fail(`${path}.children 必须是数组`)
  obj.children.forEach((child, i) => assertDocNode(child, `${path}.children[${i}]`))
}

/** 校验 ISO 8601 时间字符串（可被 Date 解析即可） */
function assertIsoString(value: unknown, path: string): void {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    fail(`${path} 必须是 ISO 8601 时间字符串`)
  }
}

/** 解析并严格校验 .mflow 文本（formatVersion 必须为 1） */
export function parseMflow(text: string): MindDoc {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    fail('文件不是合法的 JSON')
  }
  if (typeof raw !== 'object' || raw === null) fail('文件根必须是对象')
  const obj = raw as Record<string, unknown>
  if (obj.formatVersion !== 1) {
    fail(`formatVersion 必须为 1（实际为 ${JSON.stringify(obj.formatVersion)}）`)
  }
  if (typeof obj.id !== 'string' || obj.id === '') fail('id 必须是非空字符串')
  if (typeof obj.title !== 'string') fail('title 必须是字符串')
  if (typeof obj.structure !== 'string' || !STRUCTURE_TYPES.has(obj.structure)) {
    fail(`structure 必须是七种结构之一（实际为 ${JSON.stringify(obj.structure)}）`)
  }
  if (typeof obj.theme !== 'string') fail('theme 必须是字符串')
  assertDocNode(obj.root, 'root')
  assertIsoString(obj.createdAt, 'createdAt')
  assertIsoString(obj.updatedAt, 'updatedAt')
  return raw as MindDoc
}

/** FileReader 读取 .mflow 文件并校验 */
export function readMflowFile(file: File): Promise<MindDoc> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new MflowParseError('文件读取失败'))
    reader.onload = () => {
      try {
        resolve(parseMflow(typeof reader.result === 'string' ? reader.result : ''))
      } catch (err) {
        reject(err instanceof Error ? err : new MflowParseError(String(err)))
      }
    }
    reader.readAsText(file)
  })
}

/** 过滤文件名非法字符（Windows 保留字符等） */
function sanitizeFilename(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|]/g, '_').trim()
  return cleaned === '' ? '未命名' : cleaned
}

/** 导出文件名：MindFlow-标题.mflow */
export function buildMflowFilename(doc: MindDoc): string {
  return `MindFlow-${sanitizeFilename(doc.title)}.mflow`
}

/** 保存选项（File System Access API；类型缺省浏览器上为可选属性） */
interface SavePickerOptions {
  suggestedName?: string
  types?: { description?: string; accept: Record<string, string[]> }[]
}

interface SavePickerWindow extends Window {
  showSaveFilePicker?: (options?: SavePickerOptions) => Promise<FileSystemFileHandle>
}

/**
 * 导出文档为 .mflow 文件。
 * 返回实际采用的途径：'fsaa'（系统保存对话框直写）或 'download'（Blob 下载）。
 * 用户在系统对话框取消（AbortError）时向上抛出，由调用方静默处理。
 * 导出即保存：内容先同步 title = root.text 镜像（契约 §2「保存时同步」）。
 */
export async function saveMflowFile(doc: MindDoc): Promise<'fsaa' | 'download'> {
  const toSave: MindDoc = doc.title === doc.root.text ? doc : { ...doc, title: doc.root.text }
  const content = JSON.stringify(toSave, null, 2)
  const filename = buildMflowFilename(toSave)
  const pickerWindow = window as SavePickerWindow

  if (typeof pickerWindow.showSaveFilePicker === 'function') {
    try {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'MindFlow 文档', accept: { 'application/json': ['.mflow'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(new Blob([content], { type: 'application/json' }))
      await writable.close()
      return 'fsaa'
    } catch (err) {
      // 用户主动取消：向上抛出（调用方静默）；其他异常降级为下载
      if (err instanceof DOMException && err.name === 'AbortError') throw err
    }
  }

  // 降级路径：Blob + <a download>
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
  return 'download'
}
