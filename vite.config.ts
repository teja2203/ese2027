import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { copyFileSync, mkdirSync, cpSync, existsSync } from 'node:fs'

const staticAssets = ['icons', 'fonts']

// After the bundle is emitted, copy static assets that Vite does not manage:
// manifest.json, icons/, fonts/ (referenced by manifest.json + @font-face).
function copyStaticAssets() {
  return {
    name: 'copy-static-assets',
    apply: 'build',
    closeBundle() {
      const out = path.resolve(__dirname, 'dist')
      for (const asset of staticAssets) {
        const src = path.resolve(__dirname, asset)
        if (!existsSync(src)) continue
        const dest = path.resolve(out, asset)
        if (asset.includes('.')) {
          mkdirSync(out, { recursive: true })
          copyFileSync(src, dest)
        } else {
          cpSync(src, dest, { recursive: true })
        }
      }
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), copyStaticAssets()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          radix: [
            '@radix-ui/react-accordion',
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-switch',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip'
          ]
        }
      }
    }
  }
})
