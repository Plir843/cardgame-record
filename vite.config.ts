import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // 배포 위치가 정해지지 않았으므로 상대 경로로 빌드한다 (어느 하위 경로에 올려도 동작)
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 새 버전은 사용자가 '업데이트'를 눌렀을 때 적용한다 (src/components/UpdatePrompt.tsx)
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '전적 기록',
        short_name: '전적',
        description: '카드게임 대회 전적 기록과 통계',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#101216',
        theme_color: '#101216',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 앱 전체를 미리 캐시해 인터넷 없이도 열리게 한다
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  define: {
    // 설정 화면에 표시할 앱 버전 (npm 스크립트로 실행할 때 package.json 의 version 이 들어온다)
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev'),
  },
})
