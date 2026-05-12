# Docker Build Troubleshooting - npm install Issues

## Problem: npm install failing during Docker build

### Root Causes:
1. **Network timeouts** - npm registry connection issues
2. **Outdated dependencies** - Some packages in package.json are very old
3. **Cache corruption** - npm cache issues
4. **Node version compatibility** - Dependencies not compatible with Node 18

### Fixes Applied:

#### 1. **Improved npm install with retry logic**
```dockerfile
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --only=production --no-audit --no-fund --prefer-offline --no-optional || \
    (npm cache clean --force && npm ci --only=production --no-audit --no-fund --no-optional)
```

#### 2. **Used Alpine Linux consistently**
- Changed from `node:18-slim` back to `node:18-alpine`
- Removed unnecessary `apt-get` installations
- Smaller image size, faster builds

#### 3. **Optimized build process**
- Used `npm ci` instead of `npm install` for reproducible builds
- Added `--no-audit --no-fund --prefer-offline` flags
- Proper multi-stage build with selective file copying

### If Build Still Fails:

#### Option 1: Clear Docker cache and rebuild
```bash
docker system prune -a
docker build --no-cache -t natours:latest .
```

#### Option 2: Update outdated dependencies
Some packages are very old and may need updating:
- `mongoose`: ^5.5.2 → ^8.0.0 (major version jump, may need code changes)
- `express`: ^4.16.4 → ^4.18.0
- `helmet`: ^3.16.0 → ^7.0.0
- `stripe`: ^7.0.0 → ^14.0.0

#### Option 3: Use different Node version
If compatibility issues persist, try Node 16:
```dockerfile
FROM node:16-alpine AS builder
```

#### Option 4: Manual npm install with verbose logging
```bash
# Test locally first
npm config set registry https://registry.npmjs.org/
npm cache clean --force
npm install --verbose
```

### Testing the Fix:

```bash
# Build the image
docker build -t natours:latest .

# Run locally to test
docker run -p 3000:3000 \
  -e DATABASE=mongodb://localhost:27017/natours \
  -e JWT_SECRET=test-secret \
  natours:latest

# Check if app starts
curl http://localhost:3000
```

### Environment Variables Required:
```bash
NODE_ENV=production
DATABASE=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90
STRIPE_SECRET_KEY=sk_test_...
EMAIL_HOST=smtp.gmail.com
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@natours.com
```