import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'AstroalignJS',
      fileName: 'astroalign',
      formats: ['es']
    },
    rollupOptions: {
      external: ['kdt', 'ml-ransac', 'ndarray-warp']
    }
  }
})
