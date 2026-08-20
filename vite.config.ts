import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Ver 1.0 — 제작자·버전·빌드 시각을 앱에 주입하고, 배포마다 version.json을 함께 내보낸다.
// 열려 있는 탭이 version.json을 주기적으로 확인해 새 배포를 감지하면 새로고침을 안내한다.
const APP_VERSION = '1.0';
const BUILD_TIME = new Date().toISOString();

function versionJson(): Plugin {
  return {
    name: 'chloe-version-json',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: APP_VERSION, buildTime: BUILD_TIME }),
      });
    },
    configureServer(server) {
      // dev에서도 같은 경로 제공 (업데이트 배너 로직 검증용)
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ version: APP_VERSION, buildTime: BUILD_TIME }));
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './', // GitHub Pages 하위 경로(https://<user>.github.io/<repo>/)에서도 동작
  plugins: [react(), tailwindcss(), versionJson()],
  server: { port: 5174 },
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
});
