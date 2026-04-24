import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,

    allowedHosts: [
      'dnsryzen.com',
      'www.dnsryzen.com'
    ],

    origin: 'https://dnsryzen.com',

    hmr: {
      host: 'dnsryzen.com',
      protocol: 'wss',
      clientPort: 443
    },

    watch: {
      usePolling: true
    }
  }
})
