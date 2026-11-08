import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Khi chạy `npm run dev` ngoài Docker, chuyển tiếp API sang Laravel để giữ cùng origin (Sanctum SPA).
  // Trong Docker, Nginx đã làm reverse proxy nên proxy này không được dùng tới.
  const apiTarget = env.VITE_DEV_API_PROXY ?? 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      // Bind mount trên Windows/macOS không phát sinh sự kiện inotify trong container.
      watch: env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 1000 } : undefined,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: false },
        '/sanctum': { target: apiTarget, changeOrigin: false },
      },
    },
  }
})
