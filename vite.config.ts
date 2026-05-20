import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves from /repo-name/ — set VITE_BASE_PATH=/your-repo/ when building for Pages
const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
})
