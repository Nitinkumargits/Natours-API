# Natours — Deployment Guide

## Overview

```
User → https://natours.nitinkdevs.com (port 443)
          ↓
       Nginx (SSL termination)
          ↓
  Docker container (localhost:3000)
          ↓
     MongoDB Atlas
```

---

## Prerequisites

- AWS EC2 instance (Ubuntu)
- Root domain registered on AWS Route 53 (`nitinkdevs.com`) — this project uses subdomain `natours.nitinkdevs.com`
- MongoDB Atlas cluster
- Docker Hub account
- GitHub repository with Actions enabled

---

## Step 1 — Fix Domain (clientHold)

If the **root domain** `nitinkdevs.com` has status `clientHold`, email verification was not completed.

1. Go to **Route 53 → Registered domains → nitinkdevs.com → Actions**
2. Click **Resend verification email**
3. Check inbox at `nitinkwork18@gmail.com` for email from `noreply@registrar.amazon.com`
4. Click the verification link
5. Wait 10–15 minutes, then verify the subdomain resolves:

```bash
dig natours.nitinkdevs.com +short
# Should return: 13.126.7.60
```

---

## Step 2 — Route 53 DNS Records

Go to **Route 53 → Hosted zones → nitinkdevs.com** and ensure these records exist:

| Name | Type | Value | TTL |
|------|------|-------|-----|
| natours.nitinkdevs.com | A | `<EC2 public IP>` | 300 |
| www.natours.nitinkdevs.com | A | `<EC2 public IP>` | 300 |

Get your EC2 public IP:
```bash
curl ifconfig.me
```

---

## Step 3 — EC2 Security Group

In **AWS Console → EC2 → Security Groups**, add inbound rules:

| Type | Port | Source |
|------|------|--------|
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |
| SSH | 22 | Your IP |

> Do **not** expose port 3000 publicly — Nginx handles all incoming traffic.

---

## Step 4 — GitHub Secrets

Go to **GitHub → repo → Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `DOCKERHUB_USERNAME` | `nitinkdocker18` |
| `DOCKER_PASSWORD` | Your Docker Hub password/token |
| `EC2_HOST` | EC2 public IP (`13.126.7.60`) |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Contents of your `.pem` private key file |

---

## Step 5 — One-Time EC2 Setup (run manually once)

SSH into EC2:
```bash
ssh -i your-key.pem ubuntu@13.126.7.60
```

Install Docker:
```bash
sudo apt-get update -y
sudo apt-get install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
```

Install Nginx and Certbot:
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Allow GitHub Actions to run sudo without password prompt:
```bash
echo "ubuntu ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/github-actions
```

Create env file directory and add secrets:
```bash
sudo mkdir -p /opt/natours
sudo nano /opt/natours/prod.env
```

Paste your environment variables:
```env
NODE_ENV=production
DATABASE=mongodb://user:pass@host1:27017,host2:27017,host3:27017/dbname?authSource=admin&replicaSet=...
DATABASE_PASSWORD=your_password
PORT=3000
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90
EMAIL_HOST=smtp.gmail.com
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_PORT=587
EMAIL_FROM=your_email@gmail.com
STRIPE_SECRET_KEY=sk_test_...
```

---

## Step 6 — SSL/TLS Setup

SSL is handled by **Nginx + Let's Encrypt (Certbot)**. Nginx terminates SSL on port 443 and forwards plain HTTP to the Docker container on `localhost:3000`. The app never deals with certificates directly.

### How it works

```
Browser → HTTPS (port 443) → Nginx → HTTP (port 3000) → Docker app
                  ↑
        Let's Encrypt certificate
        (auto-renewed every 90 days)
```

### Requirements before getting a certificate

- Domain must resolve publicly: `dig natours.nitinkdevs.com +short` must return `13.126.7.60`
- Port 80 must be open in EC2 Security Group (Certbot uses it for verification)
- Nginx must be installed and running

### Nginx config (`nginx/natours.conf`)

This file is in the repo and gets copied to EC2 on every deploy by GitHub Actions:

```nginx
server {
    listen 80;
    server_name natours.nitinkdevs.com www.natours.nitinkdevs.com;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> After Certbot runs, it automatically adds HTTPS blocks to this file.

### Apply Nginx config manually (first time only)

```bash
sudo cp ~/nginx/natours.conf /etc/nginx/sites-available/natours
sudo ln -sf /etc/nginx/sites-available/natours /etc/nginx/sites-enabled/natours
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Obtain SSL certificate manually (first time only)

```bash
sudo certbot --nginx \
  --non-interactive \
  --agree-tos \
  --email nitinkwork18@gmail.com \
  -d natours.nitinkdevs.com \
  -d www.natours.nitinkdevs.com
```

Certbot will:
1. Verify domain ownership via HTTP challenge on port 80
2. Download the certificate from Let's Encrypt
3. Automatically update the Nginx config to redirect HTTP → HTTPS
4. Set up a cron job for auto-renewal every 90 days

### Verify certificate

```bash
sudo certbot certificates
```

Expected output:
```
Found the following certs:
  Certificate Name: natours.nitinkdevs.com
    Domains: natours.nitinkdevs.com www.natours.nitinkdevs.com
    Expiry Date: 2026-08-XX (VALID: 89 days)
    Certificate Path: /etc/letsencrypt/live/natours.nitinkdevs.com/fullchain.pem
    Private Key Path: /etc/letsencrypt/live/natours.nitinkdevs.com/privkey.pem
```

### Test auto-renewal

```bash
sudo certbot renew --dry-run
```

### After first deploy — fully automatic

The GitHub Actions pipeline skips Certbot on subsequent deploys (cert already exists) and only reloads Nginx:

```yaml
if [ ! -d /etc/letsencrypt/live/natours.nitinkdevs.com ]; then
  # First deploy — obtain cert
  sudo certbot --nginx ...
else
  # Already have cert — just reload
  sudo systemctl reload nginx
fi
```

### What the app does with HTTPS

The Express app already handles the `X-Forwarded-Proto` header sent by Nginx, so JWT cookies are automatically marked `secure` over HTTPS:

```js
// controllers/authController.js
cookieOptions.secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
```

No code changes needed — Nginx handles everything.

### HTTP → HTTPS redirect

After Certbot runs, Nginx automatically redirects all HTTP traffic to HTTPS:

```
http://natours.nitinkdevs.com     →  https://natours.nitinkdevs.com  (301 redirect)
http://www.natours.nitinkdevs.com →  https://natours.nitinkdevs.com  (301 redirect)
```

### Troubleshooting SSL

| Problem | Cause | Fix |
|---------|-------|-----|
| Certbot NXDOMAIN | DNS not propagated | Wait for `dig natours.nitinkdevs.com +short` to return EC2 IP |
| Certbot NXDOMAIN | Domain on `clientHold` | Complete email verification in Route 53 Registered domains |
| Certificate expired | Auto-renewal failed | Run `sudo certbot renew` manually |
| ERR_SSL_PROTOCOL_ERROR | Nginx not reloaded after cert | Run `sudo systemctl reload nginx` |
| Mixed content warnings | App serving HTTP assets over HTTPS | Ensure all asset URLs use relative paths or HTTPS |

---

## Step 7 — Deploy (automatic on every push)

Push to master to trigger the GitHub Actions pipeline:

```bash
git add .
git commit -m "deploy"
git push origin master
```

The pipeline automatically:
1. Builds and tags a new Docker image (e.g. `v5`)
2. Pushes it to Docker Hub (`nitinkdocker18/natoursapi:v5` and `:latest`)
3. SSHes into EC2 and:
   - Installs Nginx/Docker if missing
   - Copies Nginx config
   - Obtains SSL certificate via Certbot (first deploy only)
   - Pulls and starts the new Docker container on `127.0.0.1:3000`
   - Runs a health check
   - Cleans up old images

---

## Step 7 — Verify Deployment

```bash
# Check container is running
docker ps

# Check logs
docker logs -f app

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check SSL cert
sudo certbot certificates
```

Visit `https://natours.nitinkdevs.com` in the browser.

---

## Troubleshooting

### DNS not resolving (`NXDOMAIN`)
- Check domain status in Route 53 → Registered domains (must not be `clientHold`)
- Verify nameservers in Registered domains match the Hosted zone NS record
- Check A record exists in Hosted zone

### Port already in use (EADDRINUSE)
```bash
# Find and kill the process on port 3000
netstat -ano | grep :3000
kill -9 <PID>
```

### Container crashes on start
```bash
docker logs app
# Most common causes:
# - /opt/natours/prod.env missing or incomplete
# - MongoDB connection refused (cluster paused or IP not whitelisted)
```

### SSL cert fails (Certbot NXDOMAIN)
- DNS must resolve publicly before running Certbot
- Run `dig natours.nitinkdevs.com +short` — must return the EC2 IP
- If domain is on `clientHold`, complete email verification first

### MongoDB connection error (querySrv EREFUSED)
The `mongodb+srv://` SRV lookup fails intermittently. Use a direct connection string instead:
```env
DATABASE=mongodb://user:pass@shard-00-00.xxx.mongodb.net:27017,shard-00-01.xxx.mongodb.net:27017,shard-00-02.xxx.mongodb.net:27017/dbname?authSource=admin&replicaSet=atlas-xxx&ssl=true
```

---

## Architecture Summary

| Component | Technology | Location |
|-----------|-----------|----------|
| App server | Node.js + Express | Docker container (`127.0.0.1:3000`) |
| Reverse proxy + SSL | Nginx + Let's Encrypt | EC2 host |
| Database | MongoDB Atlas | Cloud |
| Container registry | Docker Hub | Cloud |
| CI/CD | GitHub Actions | `.github/workflows/docker-build-push.yml` |
| DNS | AWS Route 53 | Cloud |
| Hosting | AWS EC2 (Ubuntu) | `13.126.7.60` |
