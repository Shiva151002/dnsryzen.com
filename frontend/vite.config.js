import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // allow external access
    port: 5173,
    strictPort: true,

    // allow your domain
    allowedHosts: ['dnsryzen.com'],

    // 🔥 important for domain + HAProxy
    hmr: {
      host: 'dnsryzen.com',
      protocol: 'ws', // use 'wss' if you're using HTTPS
      port: 5173,
      overlay: false
    },

    watch: {
      usePolling: true abcdefgh
    }
  }
})
