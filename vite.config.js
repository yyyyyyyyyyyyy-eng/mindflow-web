import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 接后端 API 时取消注释并按需修改，避免跨域直连：
// server: { proxy: { '/api': 'http://127.0.0.1:8642' } }
export default defineConfig({
  plugins: [react()]
})
