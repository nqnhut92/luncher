import { defineConfig } from 'vite';

// Two pages: the lunch app at / and the personal afternoon drink picker at /chieunayuonggi.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        chieunayuonggi: 'chieunayuonggi/index.html',
      },
    },
  },
});
