import { useState } from 'react'

// 临时占位 App：随文档列表页 / 编辑页实现将被整体替换
export default function App() {
  const [count, setCount] = useState(0)
  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>MindFlow Web</h1>
      <p>React 19 + Vite + TypeScript 已就绪。</p>
      <button onClick={() => setCount(count + 1)}>点我（{count}）</button>
    </main>
  )
}
