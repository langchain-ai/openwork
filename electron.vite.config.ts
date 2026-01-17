import { resolve } from 'path'
import { readFileSync, copyFileSync, existsSync, mkdirSync } from 'fs'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Plugin to copy resources to output
function copyResources(): { name: string; closeBundle: () => void } {
  return {
    name: 'copy-resources',
    closeBundle(): void {
      const srcIcon = resolve('resources/icon.png')
      const destDir = resolve('out/resources')
      const destIcon = resolve('out/resources/icon.png')

      if (existsSync(srcIcon)) {
        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true })
        }
        copyFileSync(srcIcon, destIcon)
      }
    }
  }
}

export default defineConfig({
  main: {
    // Bundle all dependencies into the main process
    build: {
      lib: {
        entry: 'src/main/index.ts',
        formats: ['cjs']
      },
      rollupOptions: {
        external: ['electron'],
        plugins: [copyResources()]
      }
    }
  },
  preload: {},
  renderer: {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
