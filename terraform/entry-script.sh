#!/bin/bash
set -e

apt-get update -y
apt-get install -y docker.io nginx certbot python3-certbot-nginx

systemctl enable docker
systemctl start docker
systemctl enable nginx
systemctl start nginx

usermod -aG docker ubuntu

echo "ubuntu ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/github-actions
chmod 0440 /etc/sudoers.d/github-actions

mkdir -p /opt/natours
