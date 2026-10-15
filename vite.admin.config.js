import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// CondoFlow Gestão (condominium admins): its own entry (admin/index.html),
// built to dist-admin/ — the web directory packaged by Capacitor in android-admin/.
export default defineConfig({
  root: fileURLToPath(new URL('./admin', import.meta.url)),
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    outDir: fileURLToPath(new URL('./dist-admin', import.meta.url)),
    emptyOutDir: true
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
