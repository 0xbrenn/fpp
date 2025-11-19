import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // ✅ CRITICAL: Prevents 504 "Outdated Optimize Dep" errors
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      'ethers',
      'lucide-react',
      '@reown/appkit',
      '@reown/appkit/react',
      '@reown/appkit-adapter-ethers5'
    ],
    force: true, // Force re-optimization on server start
  },
  
  // ✅ Dev server config
  server: {
    port: 5173,
    host: true,
    historyApiFallback: true, // Required for React Router
    fs: {
      strict: false, // Allow serving files outside root
    },
  },
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ethers-vendor': ['ethers'],
          'ui-vendor': ['lucide-react'],
          'wallet-vendor': ['@reown/appkit', '@reown/appkit/react', '@reown/appkit-adapter-ethers5']
        }
      }
    },
    
    chunkSizeWarningLimit: 1000
  },
  
  define: {
    'process.env': {}
  },
  
  preview: {
    port: 3000,
    host: true,
    historyApiFallback: true,
  }
})