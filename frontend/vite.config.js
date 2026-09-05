import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load server-side environment variables from repository root
  const env = loadEnv(mode, resolve(__dirname, '..'), '')
  const apiKey = env.EXPORT_API_KEY || process.env.EXPORT_API_KEY || 'test-auth-secret-key-12345'
  const backendTarget = env.VITE_BACKEND_URL || process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: 'localhost',
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              if (apiKey) {
                proxyReq.setHeader('X-API-Key', apiKey)
              }
            })
          }
        }
      }
    }
  }
})
