#!/bin/bash
# setup-ax42.sh

set -e

echo ">>> [1/5] Updating System..."
apt update && apt upgrade -y && apt autoremove -y

echo ">>> [2/5] Installing Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

echo ">>> [3/5] Tuning Network Stack (sysctl)..."
cat <<EOF > /etc/sysctl.d/99-nexis-tuning.conf
net.core.rmem_max = 26214400
net.core.wmem_max = 26214400
fs.file-max = 65536
EOF
sysctl --system

echo ">>> [4/5] Creating Directory Structure..."
mkdir -p /opt/nexis-network/nginx/conf.d
mkdir -p /opt/nexis-network/certbot/conf
mkdir -p /opt/nexis-network/certbot/www

echo ">>> [5/5] Setup Complete!"
echo "Next Steps:"
echo "1. Copy your 'docker-compose.prod.yml' to /opt/nexis-network/"
echo "2. Copy 'nginx/conf.d/app.conf' to /opt/nexis-network/nginx/conf.d/"
echo "3. Run: cd /opt/nexis-network && docker compose up -d"
