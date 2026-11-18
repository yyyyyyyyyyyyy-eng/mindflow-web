import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app">
      <h1>MindFlow Web</h1>
      <p>React 18 + Vite 已就绪。</p>
      <p>点击次数：{count}</p>
      <button onClick={() => setCount(count + 1)}>点我</button>
      <style>{`
        :root { --bg:#f6f7f9; --panel:#fff; --text:#1a1d21; --accent:#4f7cf7; --radius:12px; }
        * { box-sizing:border-box; margin:0; }
        body { font-family:-apple-system,system-ui,sans-serif; background:var(--bg); color:var(--text); }
        .app { display:flex; flex-direction:column; align-items:flex-start; gap:12px; max-width:720px; margin:48px auto; padding:24px; background:var(--panel); border-radius:var(--radius); box-shadow:0 1px 4px rgba(0,0,0,.06); }
        h1 { font-size:22px; }
        button { background:var(--accent); color:#fff; border:0; border-radius:8px; padding:10px 18px; font-size:14px; cursor:pointer; }
      `}</style>
    </main>
  )
}
