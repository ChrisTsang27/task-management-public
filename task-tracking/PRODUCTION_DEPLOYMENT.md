# Production Deployment Guide

## Performance Optimizations for Production

This guide ensures all performance optimizations are properly deployed to production.

### 🚀 Pre-Deployment Checklist

#### 1. Build Verification
```bash
# Run production build locally to verify optimizations
npm run build
npm start
```

#### 2. Environment Variables
Ensure these are set in your production environment:
```
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
```

#### 3. Vercel Configuration
The `vercel.json` file includes:
- ✅ Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- ✅ Static asset caching (1 year with immutable)
- ✅ API response caching (60s with stale-while-revalidate)
- ✅ Service worker configuration

### 📦 Production Optimizations Included

#### Bundle Optimizations
- **Code Splitting**: Automatic vendor, UI, editor, and Supabase chunks
- **Tree Shaking**: Unused code elimination
- **Package Optimization**: Optimized imports for lucide-react, @radix-ui, @tiptap
- **Dependency Cleanup**: Removed unused @tiptap extensions

#### Caching Strategy
- **Static Assets**: 1-year cache with immutable directive
- **API Routes**: 60-second cache with 5-minute stale-while-revalidate
- **Service Worker**: Offline caching for critical resources
- **Image Optimization**: WebP/AVIF formats with 30-day cache

#### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### 🔧 Deployment Steps

#### For Vercel Deployment:
1. **Push to Repository**:
   ```bash
   git add .
   git commit -m "Add production performance optimizations"
   git push origin main
   ```

2. **Verify Deployment**:
   - Check build logs for successful compilation
   - Verify service worker registration in browser DevTools
   - Test caching headers using browser Network tab
   - Run Lighthouse audit for performance metrics

#### For Other Platforms:
1. **Build Command**: `npm run build`
2. **Start Command**: `npm start`
3. **Node Version**: 18+ recommended
4. **Environment**: Set `NODE_ENV=production`

### 🧪 Production Testing

#### Performance Verification
1. **Service Worker**:
   - Open DevTools → Application → Service Workers
   - Verify registration and activation
   - Check cached resources in Cache Storage

2. **Caching Headers**:
   - Open DevTools → Network tab
   - Verify static assets show `cache-control: public, max-age=31536000, immutable`
   - Verify API responses show appropriate cache headers

3. **Bundle Analysis**:
   ```bash
   npm run build:analyze
   ```
   - Verify chunk sizes are optimized
   - Check for any unexpected large dependencies

4. **Core Web Vitals**:
   - Run Lighthouse audit
   - Check PageSpeed Insights
   - Monitor real user metrics

### 📊 Expected Performance Improvements

- **First Load JS**: ~192 kB (optimized)
- **Static Asset Caching**: 1-year browser cache
- **API Response Time**: Improved with stale-while-revalidate
- **Offline Capability**: Service worker provides offline access
- **Security Score**: Enhanced with security headers

### 🔍 Monitoring

After deployment, monitor:
- **Core Web Vitals** in Google Search Console
- **Real User Monitoring** (RUM) metrics
- **Server response times** for API endpoints
- **Cache hit rates** for static assets
- **Service worker** registration and update cycles

### 🚨 Troubleshooting

#### Service Worker Issues
- Ensure `public/sw.js` is accessible at `/sw.js`
- Check browser console for registration errors
- Verify HTTPS is enabled (required for service workers)

#### Caching Issues
- Clear browser cache and test
- Verify headers in Network tab
- Check Vercel function logs for header application

#### Build Issues
- Run `npm run build` locally first
- Check for TypeScript errors
- Verify all dependencies are installed

---

**Note**: All optimizations are production-ready and will automatically activate when `NODE_ENV=production`.