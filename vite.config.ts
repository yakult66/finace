import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/** 開發時把 /api/* 交給 server/app.ts 處理，只需執行 `npm run dev` */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        try {
          const { app } = await server.ssrLoadModule('/server/app.ts')
          app(req, res)
        } catch (err) {
          next(err)
        }
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  // 讓本機 server 端程式也能讀到 .env 裡的 MONGODB_URI / API_TOKEN
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      vue(),
      tailwindcss(),
      devApi(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: '客家人守財',
          short_name: '守財',
          description: '薪資配置、資產配置與零用金的個人理財管理工具',
          lang: 'zh-Hant',
          start_url: '/',
          scope: '/',
          id: '/',
          display: 'standalone',
          background_color: '#f8fafc',
          theme_color: '#4f46e5',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,ttf,eot}'],
          // API 一律走網路，離線時由前端快取接手
          navigateFallbackDenylist: [/^\/api\//]
        }
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url))
      }
    }
  }
})
