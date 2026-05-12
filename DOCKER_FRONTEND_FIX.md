# Docker Frontend Fix - EC2 Ubuntu

## Issues Fixed

The frontend was not showing on the Docker container running on EC2 because:

1. **Missing `views` folder** - Pug templates were not copied to the production image

   - Docker was unable to render any HTML pages
   - Result: 404 or blank page

2. **Incomplete public folder** - Static assets (CSS, images) were not being copied

   - Stylesheets were missing
   - Frontend assets not available

3. **Environment Configuration** - Incorrect env file reference
   - Changed from `config.env` to `prod.env` (which exists in your repo)

## Changes Made to Dockerfile

### Before:

```dockerfile
COPY server.js ./
COPY app.js ./
COPY controllers ./controllers
COPY models ./models
COPY routes ./routes
COPY utils ./utils
COPY config.env ./config.env

COPY --from=builder /app/public ./public
```

### After:

```dockerfile
COPY server.js ./
COPY app.js ./
COPY controllers ./controllers
COPY models ./models
COPY routes ./routes
COPY utils ./utils
COPY prod.env ./prod.env

# Copy views (PUG templates)
COPY views ./views

# Copy static assets and built frontend
COPY public ./public
COPY --from=builder /app/public/dist ./public/dist
COPY --from=builder /app/public/js ./public/js
```

## Steps to Deploy

### 1. Rebuild Docker Image Locally (Test)

```bash
docker build -t natours:fixed .
docker run -p 3000:3000 \
  -e DATABASE=your-mongodb-uri \
  -e PORT=3000 \
  -e JWT_SECRET=your-secret \
  natours:fixed
```

Test at: http://localhost:3000

### 2. Build and Push to Docker Hub

```bash
docker build -t nitinkdocker18/natoursapi:latest .
docker push nitinkdocker18/natoursapi:latest
```

### 3. On EC2 Ubuntu, Pull and Run Updated Image

```bash
docker pull nitinkdocker18/natoursapi:latest

docker run -d \
  --name natours \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE=mongodb+srv://user:password@cluster.mongodb.net/db \
  -e PORT=3000 \
  -e JWT_SECRET=your-secret-key \
  -e JWT_EXPIRES_IN=90d \
  -e JWT_COOKIE_EXPIRES_IN=90 \
  -e STRIPE_SECRET_KEY=sk_test_xxxxx \
  -e EMAIL_HOST=smtp.gmail.com \
  -e EMAIL_USERNAME=your-email@gmail.com \
  -e EMAIL_PASSWORD=your-app-password \
  -e EMAIL_FROM=noreply@natours.com \
  nitinkdocker18/natoursapi:latest
```

### 4. Verify Container is Running

```bash
# Check if container is running
docker ps

# View logs
docker logs natours

# Test the app
curl http://localhost:3000
# Or visit http://<EC2-IP>:3000 in browser
```

## What Was Wrong

1. **Missing Views** - The Pug template engine couldn't find the views folder, so no HTML could be rendered
2. **Missing Static Files** - CSS and images weren't being served
3. **Wrong Env File** - Referenced `config.env` which didn't exist; should be `prod.env`

## Verification Checklist

- [ ] Docker image builds successfully locally
- [ ] Frontend loads with CSS styling at `http://localhost:3000`
- [ ] EC2 container pulls the updated image
- [ ] Frontend is visible on EC2 at `http://<EC2-IP>:3000`
- [ ] Navigation and page loads work correctly
