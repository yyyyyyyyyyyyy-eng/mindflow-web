import { useEffect, useRef, useState, type RefObject } from 'react'

/** 长按命中的节点信息（节点 id + 触点屏幕坐标，用于菜单定位） */
export interface LongPressHit {
  nodeId: string
  x: number
  y: number
}

/** 手势绑定的两个容器：viewport（滚动/事件接收层）与 content（transform 内容层） */
interface CanvasGesturesOptions {
  viewportRef: RefObject<HTMLDivElement | null>
  contentRef: RefObject<HTMLDivElement | null>
}

const MIN_SCALE = 0.3
const MAX_SCALE = 3
const LONG_PRESS_MS = 500
const LONG_PRESS_SLOP_PX = 10

/**
 * 画布触摸手势（契约 §7.1）：
 * - pinch 缩放 + 双指平移（围绕触点中点缩放）；
 * - 单指长按 500ms、位移 < 10px → 唤出节点操作菜单；
 * - 单指滑动留给浏览器滚动。
 *
 * 实现说明：
 * - React 合成 touch 事件为 passive（无法 preventDefault），故双指手势用原生
 *   addEventListener({ passive: false }) 接管，transform 命令式直写 DOM（避免每帧 setState）；
 * - TODO(mindflow-ui)：将来由真实画布（React Flow 底座）自带手势接管，本 hook 随 stub 删除。
 */
export function useCanvasGestures({ viewportRef, contentRef }: CanvasGesturesOptions) {
  const [longPress, setLongPress] = useState<LongPressHit | null>(null)
  // 长按后抑制紧随其后的 click（避免同时触发行内编辑）
  const suppressClickRef = useRef(false)
  // 缩放/平移状态（命令式直写 DOM，同时存 ref 供复位）
  const transformRef = useRef({ scale: 1, tx: 0, ty: 0 })

  useEffect(() => {
    const viewport = viewportRef.current
    if (viewport === null) return

    // 双指起始快照
    let pinchStart: {
      dist: number
      cx: number
      cy: number
      scale: number
      tx: number
      ty: number
    } | null = null
    // 长按计时
    let lpTimer: ReturnType<typeof setTimeout> | null = null
    let lpStart: { x: number; y: number } | null = null

    const applyTransform = (): void => {
      const content = contentRef.current
      if (content === null) return
      const { scale, tx, ty } = transformRef.current
      content.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`
    }

    const touchDist = (t1: Touch, t2: Touch): number =>
      Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
    const touchMid = (t1: Touch, t2: Touch): { x: number; y: number } => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    })

    const clearLpTimer = (): void => {
      if (lpTimer !== null) {
        clearTimeout(lpTimer)
        lpTimer = null
      }
    }

    const onTouchStart = (e: TouchEvent): void => {
      if (e.touches.length === 2) {
        // 双指手势开始：取消长按计时，快照当前变换
        clearLpTimer()
        const [t1, t2] = [e.touches[0], e.touches[1]]
        const mid = touchMid(t1, t2)
        const cur = transformRef.current
        pinchStart = { dist: touchDist(t1, t2), cx: mid.x, cy: mid.y, scale: cur.scale, tx: cur.tx, ty: cur.ty }
      } else if (e.touches.length === 1 && pinchStart === null) {
        // 单指：记录起点，若落在节点上则启动长按计时
        const t = e.touches[0]
        lpStart = { x: t.clientX, y: t.clientY }
        const target = e.target instanceof HTMLElement ? e.target.closest('[data-node-id]') : null
        if (target instanceof HTMLElement) {
          const nodeId = target.dataset.nodeId
          const px = t.clientX
          const py = t.clientY
          if (nodeId !== undefined) {
            lpTimer = setTimeout(() => {
              suppressClickRef.current = true
              setLongPress({ nodeId, x: px, y: py })
            }, LONG_PRESS_MS)
          }
        }
      }
    }

    const onTouchMove = (e: TouchEvent): void => {
      if (e.touches.length === 2 && pinchStart !== null) {
        // 接管双指：阻止浏览器默认缩放/滚动（passive: false）
        e.preventDefault()
        const [t1, t2] = [e.touches[0], e.touches[1]]
        const mid = touchMid(t1, t2)
        const ratio = touchDist(t1, t2) / pinchStart.dist
        const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStart.scale * ratio))
        // 围绕触点中点缩放：中点在内容坐标系中的位置保持不变
        // （推导：mid' = mid + pan - (mid0 - t0) * (s'/s0)）
        const rel = nextScale / pinchStart.scale
        const cur = transformRef.current
        cur.scale = nextScale
        cur.tx = mid.x - (pinchStart.cx - pinchStart.tx) * rel
        cur.ty = mid.y - (pinchStart.cy - pinchStart.ty) * rel
        applyTransform()
      } else if (lpStart !== null && e.touches.length === 1) {
        // 单指滑动超过阈值：取消长按
        const t = e.touches[0]
        if (Math.hypot(t.clientX - lpStart.x, t.clientY - lpStart.y) > LONG_PRESS_SLOP_PX) {
          clearLpTimer()
        }
      }
    }

    const onTouchEnd = (e: TouchEvent): void => {
      if (e.touches.length < 2) pinchStart = null
      if (e.touches.length === 0) {
        lpStart = null
        clearLpTimer()
      }
    }

    viewport.addEventListener('touchstart', onTouchStart, { passive: true })
    viewport.addEventListener('touchmove', onTouchMove, { passive: false })
    viewport.addEventListener('touchend', onTouchEnd, { passive: true })
    viewport.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      viewport.removeEventListener('touchstart', onTouchStart)
      viewport.removeEventListener('touchmove', onTouchMove)
      viewport.removeEventListener('touchend', onTouchEnd)
      viewport.removeEventListener('touchcancel', onTouchEnd)
      clearLpTimer()
    }
  }, [viewportRef, contentRef])

  /** 关闭长按菜单 */
  const clearLongPress = (): void => {
    setLongPress(null)
  }

  /** 行内编辑等 click 入口先调用：长按刚发生时吞掉本次 click（返回 true 表示应忽略） */
  const consumeClickSuppress = (): boolean => {
    const suppressed = suppressClickRef.current
    suppressClickRef.current = false
    return suppressed
  }

  /** 复位缩放与平移 */
  const resetView = (): void => {
    transformRef.current = { scale: 1, tx: 0, ty: 0 }
    const content = contentRef.current
    if (content !== null) {
      content.style.transform = 'translate(0px, 0px) scale(1)'
    }
  }

  return { longPress, clearLongPress, consumeClickSuppress, resetView }
}
