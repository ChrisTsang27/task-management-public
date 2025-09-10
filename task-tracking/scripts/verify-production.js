#!/usr/bin/env node

/**
 * Production Verification Script
 * Verifies that all performance optimizations are working in production
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = false;
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
      
      // Log performance-related headers for verification
      if (req.url.includes('/_next/static/')) {
        console.log(`✅ Static asset: ${req.url}`);
        console.log(`   Cache-Control: ${res.getHeader('Cache-Control') || 'Not set'}`);
      }
      
      if (req.url.includes('/api/')) {
        console.log(`🔄 API request: ${req.url}`);
        console.log(`   Cache-Control: ${res.getHeader('Cache-Control') || 'Not set'}`);
      }
      
      if (req.url === '/sw.js') {
        console.log(`🔧 Service Worker requested`);
        console.log(`   Cache-Control: ${res.getHeader('Cache-Control') || 'Not set'}`);
      }
      
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`\n🚀 Production server ready on http://${hostname}:${port}`);
      console.log('\n📊 Performance Verification:');
      console.log('   - Service Worker: Check /sw.js');
      console.log('   - Static Assets: Check /_next/static/* caching');
      console.log('   - API Caching: Check /api/* headers');
      console.log('   - Security Headers: Check response headers');
      console.log('\n🧪 Test URLs:');
      console.log(`   - Main App: http://${hostname}:${port}`);
      console.log(`   - Service Worker: http://${hostname}:${port}/sw.js`);
      console.log(`   - Admin: http://${hostname}:${port}/admin`);
      console.log('\n💡 Open DevTools → Network/Application tabs to verify optimizations\n');
    });
});