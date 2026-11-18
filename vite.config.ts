import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// MindFlow Web 构建配置
// 说明：base 将在「GitHub Pages 部署」需求中改为仓库名（/mindflow-web/）
export default defineConfig({
  plugins: [react()],
})
