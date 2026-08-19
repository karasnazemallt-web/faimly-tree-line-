import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/faimly-tree-line-/',
  plugins: [react()],
})
