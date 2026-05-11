# Docker & GitHub Actions Setup Guide

## Prerequisites

1. **Docker Hub Account**: Create one at https://hub.docker.com if you don't have one
2. **GitHub Secrets**: Configure your repository secrets

## Setup Instructions

### 1. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- **DOCKER_USERNAME**: Your Docker Hub username
- **DOCKER_PASSWORD**: Your Docker Hub access token (NOT your password)

To create a Docker Hub access token:

1. Go to https://hub.docker.com/settings/security
2. Click "New Access Token"
3. Give it a name and set appropriate permissions
4. Copy and paste the token as `DOCKER_PASSWORD` in GitHub Secrets

### 2. Build Locally (Optional)

```bash
# Build the image
docker build -t nitinkdocker18/natoursapi:1.0.0 .

# Run the container
docker run -p 3000:3000 \
  -e DATABASE=mongodb+srv://user:password@cluster.mongodb.net/db \
  -e PORT=3000 \
  -e JWT_SECRET=your-secret \
  nitinkdocker18/natoursapi:1.0.0

# Test
curl http://localhost:3000
```

### 3. Automatic Deployment via GitHub Actions

The workflow triggers automatically on:

- **Push to master/main**: Creates tags with timestamp and commit SHA
- **Manual workflow dispatch**: Allows custom tag names

#### Automatic Push Example:

```
Push → GitHub detects changes on master
       ↓
       Builds image
       ↓
       Tags as: nitinkdocker18/natoursapi:v20250511-143022-a1b2c3d
       ↓
       Also tags as: nitinkdocker18/natoursapi:latest
       ↓
       Pushes to Docker Hub
```

#### Manual Dispatch with Custom Tag:

1. Go to GitHub repository → Actions tab
2. Click "Build and Push to Docker Hub" workflow
3. Click "Run workflow"
4. Enter custom tag name (e.g., `v1.0.0`)
5. Click "Run workflow"

Image will be tagged as: `nitinkdocker18/natoursapi:v1.0.0` and `nitinkdocker18/natoursapi:latest`

### 4. Pull and Run Image from Docker Hub

**Important**: The config.env file from your repo is included in the image, but runtime environment variables always override it. Never commit sensitive secrets to your repository.

```bash
# Login to Docker Hub (first time only)
docker login

# Pull the image
docker pull nitinkdocker18/natoursapi:latest

# Run container with REQUIRED environment variables
docker run -d \
  --name natours \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE=mongodb+srv://user:password@cluster.mongodb.net/db \
  -e PORT=3000 \
  -e JWT_SECRET=your-super-secret-key \
  -e JWT_EXPIRES_IN=90d \
  -e JWT_COOKIE_EXPIRES_IN=90 \
  -e STRIPE_SECRET_KEY=sk_test_xxxxx \
  -e EMAIL_HOST=smtp.gmail.com \
  -e EMAIL_USERNAME=your-email@gmail.com \
  -e EMAIL_PASSWORD=your-app-password \
  -e EMAIL_FROM=noreply@natours.com \
  nitinkdocker18/natoursapi:latest

# View logs
docker logs -f natours

# Stop container
docker stop natours
```

**Alternative: Use .env file with Docker**

```bash
# Create a .env file with production variables
cat > prod.env << EOF
NODE_ENV=production
DATABASE=mongodb+srv://user:password@cluster.mongodb.net/db
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90
STRIPE_SECRET_KEY=sk_test_xxxxx
EMAIL_HOST=smtp.gmail.com
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@natours.com
EOF

# Secure permissions
chmod 600 /opt/natours/prod.env

# Install Docker if not already installed
sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker
sudo usermod -a -G docker ec2-user

# Run with --env-file
docker run -d \
  --name natours \
  -p 3000:3000 \
  --env-file prod.env \
  nitinkdocker18/natoursapi:latest
```

## Important: Environment Variables

The Docker image does NOT include config.env (it's in .gitignore for security):

- ⚠️ Never commit secrets to GitHub - keep config.env in .gitignore
- ✅ Always pass secrets as runtime environment variables: `docker run -e KEY=value`
- ✅ Use `--env-file prod.env` to manage multiple variables at once
- ✅ Keep prod.env on your server, not in Git

The application reads environment variables in this order (highest to lowest priority):

1. Runtime environment variables (passed to `docker run`)
2. .env file (if using `--env-file`)
3. Default values in code

```env
NODE_ENV=production
PORT=3000
DATABASE=mongodb+srv://user:password@cluster.mongodb.net/db
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90
STRIPE_SECRET_KEY=sk_test_xxxxx
EMAIL_HOST=smtp.gmail.com
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@natours.com
```

## Docker Image Tags

All images are automatically tagged with:

- **Specific version**: `nitinkdocker18/natoursapi:v20250511-143022-a1b2c3d`
- **Latest**: `nitinkdocker18/natoursapi:latest`

## Workflow Logs

Monitor the build process:

1. Go to Actions tab in your repository
2. Click on the latest workflow run
3. Check logs for "Build and Push to Docker Hub" step

## Production Deployment

For production environments, consider:

1. Using specific version tags instead of `latest`
2. Setting up health checks
3. Using Docker Compose or Kubernetes for orchestration
4. Setting up secrets management properly

## Troubleshooting

### Build fails with "npm run build:js"

- Ensure `parcel-bundler` is installed: `npm install`
- Check that node_modules are not in .dockerignore

### Login to Docker Hub fails

- Verify DOCKER_USERNAME and DOCKER_PASSWORD are correct
- Ensure you're using an access token, not your password
- Check token has "Read, Write & Delete" permissions

### Image doesn't start

- Check container logs: `docker logs container-name`
- Verify all required environment variables are set
- Ensure database connection string is correct
