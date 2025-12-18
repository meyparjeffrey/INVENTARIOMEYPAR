import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const pkgVersion = (() => {
    try {
      const pkgPath = new URL('../package.json', import.meta.url);
      const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgRaw) as { version?: string };
      return pkg.version || process.env.npm_package_version || '0.0.0';
    } catch {
      return process.env.npm_package_version || '0.0.0';
    }
  })();

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
      // Fuente de verdad: package.json version (fallback a npm_package_version)
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkgVersion),
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
  };
});
