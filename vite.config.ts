import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig(() => {
  const e2eHmrPort = Number.parseInt(process.env.STRIPLY_E2E_HMR_PORT || '', 10);
  const hmr = Number.isInteger(e2eHmrPort)
    ? { host: '127.0.0.1', port: e2eHmrPort, clientPort: e2eHmrPort }
    : process.env.DISABLE_HMR !== 'true';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Browser tests allocate a dedicated HMR port, avoiding the active development server.
      // DISABLE_HMR still keeps the existing low-resource editing mode available.
      hmr,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      exclude: [...configDefaults.exclude, 'tests/**', '.worktrees/**']
    },
  };
});
