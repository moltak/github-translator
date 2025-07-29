import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js', 
        assetFileNames: '[name].[ext]',
        format: 'es',
      },
      external: [], // 모든 의존성을 번들에 포함
    },
    target: 'es2020',
    minify: false,
    sourcemap: true,
    copyPublicDir: false,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})