#!/bin/bash
# One-time EC2 server setup script.
# Run this once on a fresh EC2 instance before the first deploy.

set -e

DOMAIN="nitinkdevs.com"
EMAIL="nitinkwork18@gmail.com"
ENV_DIR="/opt/natours"

echo "=== Installing dependencies ==="
sudo apt-get update -y
sudo apt-get install -y nginx certbot python3-certbot-nginx docker.io

echo "=== Starting and enabling services ==="
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu

echo "=== Creating env directory ==="
sudo mkdir -p $ENV_DIR
echo "Place your prod.env file at $ENV_DIR/prod.env before deploying."
echo "  Example: scp prod.env ubuntu@<ec2-ip>:$ENV_DIR/prod.env"

echo "=== Configuring Nginx ==="
sudo cp "$(dirname "$0")/../nginx/natours.conf" /etc/nginx/sites-available/natours

if [ ! -f /etc/nginx/sites-enabled/natours ]; then
    sudo ln -s /etc/nginx/sites-available/natours /etc/nginx/sites-enabled/natours
fi

sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "=== Obtaining SSL certificate ==="
sudo certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

echo "=== Verifying auto-renewal ==="
sudo certbot renew --dry-run

echo ""
echo "=== Setup complete ==="
echo "SSL is active for $DOMAIN."
echo "Now push to master to trigger the first deployment."
