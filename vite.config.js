import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  let sentryPlugins = []
  if (mode === 'production' && env.SENTRY_AUTH_TOKEN) {
    try {
      const { sentryVitePlugin } = await import('@sentry/vite-plugin')
      sentryPlugins.push(
        sentryVitePlugin({
          org: env.SENTRY_ORG,
          project: env.SENTRY_PROJECT,
          authToken: env.SENTRY_AUTH_TOKEN,
        })
      )
    } catch {
      // @sentry/vite-plugin not installed — skip Sentry source map upload
    }
  }

  return {
    plugins: [
      react(),
      ...sentryPlugins,
    ],
    server: {
      port: 5173,
    },
    build: {
      sourcemap: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      css: true,
    },
  }
})
