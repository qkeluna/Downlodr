import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        compact: true,
      },
    },
  },
});
