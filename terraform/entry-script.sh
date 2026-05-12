#!/bin/bash
set -e

mkdir -p /home/ubuntu/.ssh
echo '${public_key}' >> /home/ubuntu/.ssh/authorized_keys
chmod 700 /home/ubuntu/.ssh
chmod 600 /home/ubuntu/.ssh/authorized_keys
chown -R ubuntu:ubuntu /home/ubuntu/.ssh

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
