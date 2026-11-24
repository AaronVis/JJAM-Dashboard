import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'
import aiHandler from './api/ai.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const name of ['NVIDIA_API_KEY', 'GEMINI_API_KEY']) {
    if (!process.env[name] && env[name]) process.env[name] = env[name]
  }

  return {
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'local-ai-api',
      configureServer(server) {
        server.middlewares.use('/api/ai', aiHandler)
      },
    },
  ],
  }
})

