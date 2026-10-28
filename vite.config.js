import { defineConfig } from 'vite';

// Two pages: the lunch app at / and the personal afternoon drink picker at /uong.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        uong: 'uong/index.html',
      },
    },
  },
});
