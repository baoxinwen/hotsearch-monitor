import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 后端端口可通过环境变量覆盖（本机若 8000 被系统保留，可 BACKEND_PORT=9000 npm run dev）
const backendPort = process.env.BACKEND_PORT || '8000'
const backendTarget = `http://127.0.0.1:${backendPort}`

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: backendTarget, changeOrigin: true },
      '/health': { target: backendTarget, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
