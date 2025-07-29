import { defineConfig } from 'vite';
import { resolve } from 'path';

// 환경 변수로 빌드할 스크립트 선택
const target = process.env.BUILD_TARGET || 'all';

// 각 스크립트별 설정
const configs = {
  content: {
    input: resolve(__dirname, 'src/content/index.ts'),
    output: {
      entryFileNames: 'content.js',
      name: 'GitHubTranslatorContent',
    },
  },
  background: {
    input: resolve(__dirname, 'src/background/index.ts'),
    output: {
      entryFileNames: 'background.js',
      name: 'GitHubTranslatorBackground',
    },
  },
  popup: {
    input: resolve(__dirname, 'src/popup/popup.ts'),
    output: {
      entryFileNames: 'popup.js',
      name: 'GitHubTranslatorPopup',
    },
  },
};

// 모든 스크립트를 빌드하는 경우
const allInputs = {
  background: resolve(__dirname, 'src/background/index.ts'),
  content: resolve(__dirname, 'src/content/index.ts'),
  popup: resolve(__dirname, 'src/popup/popup.ts'),
};

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: target === 'content', // content 빌드시에만 dist 폴더 비우기
    rollupOptions: {
      input: target === 'all' ? allInputs : configs[target]?.input,
      output:
        target === 'all'
          ? {
              entryFileNames: '[name].js',
              assetFileNames: '[name].[ext]',
              format: 'iife',
              name: (chunkInfo) => {
                const names = {
                  background: 'GitHubTranslatorBackground',
                  content: 'GitHubTranslatorContent',
                  popup: 'GitHubTranslatorPopup',
                };
                return names[chunkInfo.name] || 'GitHubTranslator';
              },
            }
          : {
              ...configs[target]?.output,
              assetFileNames: '[name].[ext]',
              format: 'iife',
            },
      external: [],
    },
    target: 'es2020',
    minify: false,
    sourcemap: true,
    copyPublicDir: false,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});
