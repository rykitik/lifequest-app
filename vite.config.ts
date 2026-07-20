import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')

          if (
            normalizedId.includes('node_modules/react') ||
            normalizedId.includes('node_modules/react-dom') ||
            normalizedId.includes('node_modules/react-router') ||
            normalizedId.includes('node_modules/react-router-dom') ||
            normalizedId.includes('react/jsx')
          ) {
            return 'react-vendor'
          }

          if (normalizedId.includes('node_modules/zustand')) {
            return 'state-vendor'
          }

        },
      },
    },
  },
  server: {
    host: true,
  },
})
