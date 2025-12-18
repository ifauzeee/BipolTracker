#!/bin/bash

echo "Updating system..."
sudo apt update && sudo apt upgrade -y

echo "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker already installed."
fi

echo "Configuring Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3333/udp
sudo ufw --force enable

echo "Installing Nginx & Certbot..."
sudo apt install -y nginx certbot python3-certbot-nginx

echo "Setup Complete! Next steps:"
echo "1. Configure .env file"
echo "2. Run 'docker compose up -d --build'"
echo "3. Update Nginx config if using domain"
