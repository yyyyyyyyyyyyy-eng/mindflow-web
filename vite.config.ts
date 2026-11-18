import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// MindFlow Web 构建配置
// 说明：base 将在「GitHub Pages 部署」需求中改为仓库名（/mindflow-web/）
export default defineConfig({
  plugins: [
    react(),
    // PWA：manifest + Workbox 离线缓存（交付清单第 8 项）
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MindFlow',
        short_name: 'MindFlow',
        description: 'MindFlow 开源思维导图 · 网页版（离线可用）',
        lang: 'zh-CN',
        display: 'standalone',
        start_url: './',
        theme_color: '#f5f6f8',
        background_color: '#ffffff',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 预缓存全部静态产物：断网后应用可完整打开
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
