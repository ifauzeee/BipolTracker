# 🚀 Deployment Guide for BIPOL Tracker

This guide provides a comprehensive, step-by-step walkthrough for deploying the BIPOL Tracker backend and web interface to a production Linux server (VPS).

---

## 📋 Prerequisites

Before you begin, ensure you have the following:

1.  **A Virtual Private Server (VPS)**
    *   OS: Ubuntu 20.04 LTS or 22.04 LTS (Recommended)
    *   Specs: Minimum 1 CPU, 1GB RAM (2GB+ recommended for stability)
    *   Public IP Address
2.  **Domain Name (Optional but Recommended)**
    *   For HTTPS/SSL security (e.g., `tracker.yourdomain.com`).
3.  **Supabase Project**
    *   A production-ready Supabase project with your database schema set up.

---

## 🛠️ Phase 1: Server Preparation

SSH into your server:
```bash
ssh root@your_server_ip
```

### 1. Update System Packages
Keep your server secure and up-to-date.
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Git & Utilities
```bash
sudo apt install -y git curl ufw
```

### 3. Configure Firewall (UFW)
Secure your ports. We need SSH, HTTP (80), HTTPS (443), and the UDP port for tracking (3333).
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3333/udp
sudo ufw enable
```
*Type `y` to confirm enabling the firewall.*

### 4. Install Docker & Docker Compose
We use Docker to containerize the application for easy management.
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh
```
Verify installation:
```bash
docker --version
docker compose version
```

---

## 📥 Phase 2: Application Setup

### 1. Clone the Repository
Navigate to your desired directory (e.g., `/var/www` or `~/`) and clone the project.
```bash
cd ~
git clone https://github.com/ifauzeee/BIPOL.git
cd BIPOL
```

### 2. Configure Environment Variables
**CRITICAL STEP**: The application will not work without correct credentials.
```bash
cp .env.example .env
nano .env
```
*   **Action**: Fill in your `SUPABASE_URL`, `SUPABASE_KEY`, and change `NODE_ENV` to `production`.
*   **Action**: Set `USE_HTTPS=true` if you are setting up SSL.

---

## 🌐 Phase 3: Nginx & SSL (Reverse Proxy)

We use Nginx to serve the web app on port 80/443 and proxy traffic to our Node.js app (internal port 3000).

### 1. Install Nginx
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Configure Nginx
Copy the deployment config (or edit the default).
```bash
# Remove default config
sudo rm /etc/nginx/sites-enabled/default

# Create new config
sudo nano /etc/nginx/sites-available/bipol
```

Paste the following configuration (Adjust `server_name` to your domain):

```nginx
server {
    listen 80;
    server_name your-domain.com; # <--- CHANGE THIS

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Helper for Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/bipol /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Setup SSL (HTTPS)
Secure your domain with a free Let's Encrypt certificate.
```bash
sudo certbot --nginx -d your-domain.com
```
Follow the prompts. Certbot will automatically update your Nginx config.

---

## 🚀 Phase 4: Launching the Application

Start the application container using Docker Compose.

```bash
docker compose up -d --build
```
*   `-d`: Detached mode (runs in background).
*   `--build`: Rebuilds the image if code changed.

**Verify status:**
```bash
docker compose ps
docker compose logs -f
```

✅ **Success!** Your application should now be accessible at `https://your-domain.com`.

---

## 🔄 Management & Maintenance

### Updating the App
When you push new code to GitHub, update the live server:
```bash
cd ~/BIPOL
git pull
docker compose down
docker compose up -d --build
```

### Checking Logs
*   **App Logs:** `docker compose logs -f --tail=100`
*   **Nginx Logs:** `sudo tail -f /var/log/nginx/error.log`

### Database Backups
Since we use Supabase (Managed PostgreSQL), database backups are handled automatically by the Supabase platform. Check your Supabase dashboard for PITR (Point-in-Time Recovery) options.

---

## 🆘 Troubleshooting

**Common Issues:**

1.  **"502 Bad Gateway"**
    *   The Node.js app might be down. Check `docker compose logs`.
    *   Ensure `PORT=3000` is set in `.env`.

2.  **UDP Data Not Received**
    *   Check firewall: `sudo ufw status` (Must allow 3333/udp).
    *   Check VPS provider firewall (AWS Security Groups / DigitalOcean Firewalls) to ensure UDP 3333 is open incoming.

3.  **Socket.io Connection Fails**
    *   Ensure Nginx configuration includes the `Upgrade` and `Connection` headers as shown in Phase 3.
