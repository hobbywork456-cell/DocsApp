import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@mui')) return 'mui';
            if (id.includes('react-quill-new') || id.includes('quill')) return 'quill';
            if (id.includes('html2pdf') || id.includes('jspdf')) return 'pdf';
            if (id.includes('xlsx') || id.includes('pptxgenjs')) return 'office';
            return 'vendor';
          }
        }
      }
    }
  }
})
