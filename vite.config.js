import { readFile } from 'node:fs/promises';
import { defineConfig, loadEnv } from 'vite';
import { publicHandler, publicRoute } from './api/public.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  function connect(server, template) {
    server.middlewares.use((req, res, next) => {
      const route = publicRoute(req.url);
      if (!route) return next();
      const origin = `http://${req.headers.host || 'localhost'}`;
      void publicHandler(env, () => template(req.url), origin)(req, res, route);
    });
  }

  return {
    plugins: [{
      name: 'portal-public-routes',
      configureServer(server) {
        connect(server, async (url) => server.transformIndexHtml(url, await readFile('index.html', 'utf8')));
      },
      configurePreviewServer(server) {
        connect(server, () => readFile('dist/index.html', 'utf8'));
      },
    }],
  };
});
