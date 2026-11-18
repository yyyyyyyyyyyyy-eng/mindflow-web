import { useEffect, useState } from 'react'

/** 小屏判定媒体查询（契约 §7.1：<768px） */
const MOBILE_QUERY = '(max-width: 767px)'

/**
 * 是否处于小屏（<768px）。
 * 使用 matchMedia + change 事件实时跟随（含旋转、DevTools 设备模拟切换），
 * 供「大纲为默认编辑入口 / 面板折叠为底部抽屉」等布局决策使用。
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = (): void => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
