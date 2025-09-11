/** @type {import('next').NextConfig} */
import bundleAnalyzer from '@next/bundle-analyzer';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      '@tiptap/react',
      '@tiptap/starter-kit'
    ],
    // Enable faster refresh for development
    optimizeCss: true,
    // Enable faster builds
    webpackBuildWorker: true,
  },
  
  // Output file tracing configuration
  outputFileTracingRoot: __dirname,
  
  // Turbopack configuration disabled temporarily
  // turbopack: {
  //   root: __dirname,
  //   rules: {
  //     '*.svg': {
  //       loaders: ['@svgr/webpack'],
  //       as: '*.js',
  //     },
  //   },
  // },
  
  // Webpack optimizations - temporarily simplified
  webpack: (config, { dev, isServer }) => {
    // Optimized configuration for better performance
    if (!dev && !isServer) {
      // Enhanced optimization for production
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        maxAsyncRequests: 25,
        cacheGroups: {
          default: {
           minChunks: 2,
           priority: -20,
           reuseExistingChunk: true,
         },
         vendor: {
           test: /[\\/]node_modules[\\/]/,
           name: 'vendors',
           priority: -10,
           chunks: 'all',
           enforce: true,
         },
         // Separate chunk for UI components
         ui: {
           test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
           name: 'ui-components',
           priority: 15,
           chunks: 'all',
           enforce: true,
         },
         // Separate chunk for TipTap editor
         editor: {
           test: /[\\/]node_modules[\\/]@tiptap[\\/]/,
           name: 'editor',
           priority: 20,
           chunks: 'all',
           enforce: true,
         },
         // Separate chunk for Supabase
         supabase: {
           test: /[\\/]node_modules[\\/]@supabase[\\/]/,
           name: 'supabase',
           priority: 18,
           chunks: 'all',
           enforce: true,
         },
         // Calendar libraries chunk
         calendar: {
           test: /[\\/]node_modules[\\/](react-big-calendar|moment|date-fns)[\\/]/,
           name: 'calendar',
           priority: 16,
           chunks: 'all',
           enforce: true,
         },
         // DnD Kit chunk
         dnd: {
           test: /[\\/]node_modules[\\/]@dnd-kit[\\/]/,
           name: 'dnd-kit',
           priority: 14,
           chunks: 'all',
           enforce: true,
         },
         // Excel processing chunk
         excel: {
           test: /[\\/]node_modules[\\/](exceljs|papaparse)[\\/]/,
           name: 'excel',
           priority: 12,
           chunks: 'all',
           enforce: true,
         },
       },
     };
     
     // Tree shaking optimizations
     config.optimization.usedExports = true;
     config.optimization.sideEffects = false;
   }
   
   return config;
 },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  
  // Compression
  compress: true,
  
  // Remove X-Powered-By header for security
  poweredByHeader: false,
  
  // Environment variables for build optimization
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },
  
  // Disable ESLint during builds to prevent warnings from blocking deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    // Reduce memory usage in development
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),
};

export default withBundleAnalyzer(nextConfig);