import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * 개발 중에만 /api 를 배포된 Vercel 함수로 넘깁니다.
 *
 * 왜 프록시인가:
 *   api/extract.ts 는 Vercel 런타임에서만 도는 함수라 vite dev 가 실행하지 못합니다.
 *   그렇다고 브라우저에서 배포 주소를 직접 부르면 CORS 로 막힙니다.
 *   서버에 CORS 헤더를 열면 아무 사이트나 이 OPENAI_API_KEY 로 요청을 쏠 수 있습니다.
 *   프록시는 서버 코드를 건드리지 않고 개발 중에만 같은 출처인 척합니다.
 *
 * 배포하면 프론트와 함수가 같은 도메인이므로 이 설정은 쓰이지 않습니다.
 * 프론트 코드는 어느 쪽이든 '/api/extract' 하나만 부르면 됩니다.
 */
const API_ORIGIN =
  process.env.VITE_API_ORIGIN ?? 'https://minutes-to-actions-alpha.vercel.app'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_ORIGIN,
        changeOrigin: true,
      },
    },
  },
})
