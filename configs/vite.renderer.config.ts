import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    base: isProduction ? './' : '/',
    root: path.resolve(process.cwd(), '.'),
    resolve: {
      alias: {
        '@domain': path.resolve(process.cwd(), 'src/domain'),
        '@application': path.resolve(process.cwd(), 'src/application'),
        '@infrastructure': path.resolve(process.cwd(), 'src/infrastructure'),
        '@presentation': path.resolve(process.cwd(), 'src/presentation'),
      },
    },
    plugins: [react()],
    define: {
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL ?? ''),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY ?? ''),
      // También definir para import.meta.env (Vite)
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL ?? ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        env.SUPABASE_ANON_KEY ?? '',
      ),
    },
    build: {
      outDir: 'dist/renderer',
      sourcemap: true,
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(process.cwd(), 'index.html'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    optimizeDeps: {
      include: ['jspdf', 'jspdf-autotable'],
    },
  };
});
