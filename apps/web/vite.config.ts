import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import path from 'node:path';

function camundaProxy(rewritePrefix?: string, rewriteTo = ''): ProxyOptions {
  return {
    target: 'http://localhost:8088',
    changeOrigin: true,
    rewrite: rewritePrefix
      ? (requestPath) => requestPath.replace(new RegExp(`^${rewritePrefix}`), rewriteTo)
      : undefined,
    configure: (proxy) => {
      proxy.on('proxyRes', (proxyRes) => {
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
      });
    },
  };
}

function camundaShellProxy(): ProxyOptions {
  return {
    ...camundaProxy(),
    rewrite: () => '/operate/',
  };
}

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['bpmn-js', 'bpmn-js/lib/NavigatedViewer'],
  },
  server: {
    port: 3333,
    proxy: {
      '/api': {
        target: 'http://localhost:8180',
        changeOrigin: true,
      },
      '/.well-known': {
        target: 'http://localhost:8180',
        changeOrigin: true,
      },
      '/operate': camundaProxy(),
      '/tasklist': camundaProxy(),
      '/camunda-admin': camundaProxy('/camunda-admin'),
      '/identity': camundaProxy(),
      '/bpm': camundaShellProxy(),
      '/v1': camundaProxy(),
      '/v2': camundaProxy(),
      '/graphql': camundaProxy(),
    },
  },
});
