import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Serves the /api functions locally (dev + preview) using a folder as storage.
function localApi() {
  const mount = (server) => {
    process.env.LOCAL_STORE_DIR ||= path.resolve('.local-store')
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url, 'http://x')
      if (!url.pathname.startsWith('/api/cards')) return next()
      const parts = url.pathname.split('/').filter(Boolean)
      const file = parts.length > 2 ? './api/cards/[id].js' : './api/cards/index.js'
      const mod = await import(path.resolve(file) + `?t=${Date.now()}`)
      await mod.default(req, res)
    })
  }
  return { name: 'local-api', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig({ plugins: [react(), localApi()] })
