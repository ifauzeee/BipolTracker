# 🚀 BIPOL Tracker - Deployment Guide

Panduan lengkap untuk deploy BIPOL Tracker ke berbagai platform.

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Persiapan Database](#-1-persiapan-database-supabase)
- [Local Development](#-2-local-development)
- [VPS Deployment](#-3-vps-deployment-ubuntu)
- [Docker Deployment](#-4-docker-deployment)
- [Railway Deployment](#-5-railway-deployment)
- [Nginx Configuration](#-6-nginx-reverse-proxy)
- [SSL Certificate](#-7-ssl-certificate-lets-encrypt)
- [PM2 Process Manager](#-8-pm2-process-manager)
- [Monitoring](#-9-monitoring--health-checks)
- [Troubleshooting](#-troubleshooting)

---

## Prerequisites

Sebelum memulai, pastikan Anda memiliki:

- [ ] Akun [Supabase](https://supabase.com) (gratis)
- [ ] Domain name (opsional, tapi disarankan)
- [ ] VPS/Server dengan akses root (untuk self-hosted)
- [ ] Node.js 20+ terinstall
- [ ] Git terinstall

---

## 🗄️ 1. Persiapan Database (Supabase)

### Step 1.1: Buat Project

1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Klik **New Project**
3. Isi detail project:
   - **Name:** `bipol-tracker`
   - **Database Password:** Simpan dengan aman!
   - **Region:** Pilih terdekat (Singapore untuk Indonesia)
4. Tunggu project selesai dibuat (~2 menit)

### Step 1.2: Setup Database Schema

1. Di Supabase Dashboard, buka **SQL Editor**
2. Klik **New Query**
3. Copy-paste seluruh isi file `database/setup_full.sql`
4. Klik **Run** (Ctrl+Enter)
5. Pastikan tidak ada error

### Step 1.3: Dapatkan Credentials

1. Buka **Settings** → **API**
2. Catat informasi berikut:
   - **Project URL:** `https://xxxx.supabase.co`
   - **Service Role Key:** (secret, jangan share!)

### Step 1.4: Setup Geofence Zones (Opsional)

Tambahkan geofence zones di SQL Editor:

```sql
INSERT INTO "geofences" ("name", "latitude", "longitude", "radius_meters")
VALUES 
  ('Halte Depan Rektorat', -6.3721, 106.8245, 50),
  ('Halte Teknik Sipil', -6.3735, 106.8260, 50),
  ('Halte Gedung Kuliah', -6.3728, 106.8230, 50);
```

---

## 💻 2. Local Development

### Step 2.1: Clone & Install

```bash
# Clone repository
git clone https://github.com/ifauzeee/BIPOL.git
cd BIPOL

# Install dependencies
npm install
```

### Step 2.2: Konfigurasi Environment

```bash
# Copy template
cp .env.example .env

# Edit file
nano .env
```

**Minimal .env untuk development:**

```env
# Server
PORT=3000
UDP_PORT=3333

# Database (dari Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Security
SESSION_SECRET=random-string-minimal-32-karakter
USE_HTTPS=false

# Development
ALLOWED_ORIGINS=http://localhost:3000
```

> 💡 **Tip:** Generate session secret dengan command:
> ```bash
> openssl rand -hex 32
> ```

### Step 2.3: Build & Run

```bash
# Build frontend
npm run build

# Jalankan server
npm start
```

### Step 2.4: Akses Aplikasi

- **Web App:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin
- **Login:** username `admin`, password `admin123`

---

## 🖥️ 3. VPS Deployment (Ubuntu)

### Step 3.1: Persiapan Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v  # Should show v20.x.x
npm -v   # Should show 10.x.x

# Install git
sudo apt install -y git
```

### Step 3.2: Clone Repository

```bash
# Buat direktori aplikasi
sudo mkdir -p /var/www/bipol
sudo chown $USER:$USER /var/www/bipol
cd /var/www/bipol

# Clone repo
git clone https://github.com/ifauzeee/BIPOL.git .

# Install dependencies
npm install --production
```

### Step 3.3: Konfigurasi Environment

```bash
# Buat file .env
nano .env
```

**Production .env:**

```env
# Server
PORT=3000
UDP_PORT=3333

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Security (PENTING!)
SESSION_SECRET=your-very-long-random-secret-string-here
USE_HTTPS=true
ALLOWED_ORIGINS=https://bipoltracker.cloud,https://www.bipoltracker.cloud

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
RATE_LIMIT_LOGIN_MAX=5

# Data Retention
DATA_RETENTION_HOURS=72
CACHE_TTL_MS=5000

# Tracker Logic
GAS_ALERT_THRESHOLD=600
BUS_STOP_TIMEOUT_MINUTES=5
UDP_MIN_SPEED_THRESHOLD=3.0
```

### Step 3.4: Build Frontend

```bash
npm run build
```

### Step 3.5: Setup Firewall

```bash
# Allow SSH
sudo ufw allow 22

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow UDP for GPS tracker
sudo ufw allow 3333/udp

# Enable firewall
sudo ufw enable
```

### Step 3.6: Test Run

```bash
# Test manual
npm start

# Buka browser ke http://YOUR_SERVER_IP:3000
# Ctrl+C untuk stop
```

---

## 🐳 4. Docker Deployment

### Option A: Docker Compose (Recommended)

```bash
# Clone repository
git clone https://github.com/ifauzeee/BIPOL.git
cd BIPOL

# Setup environment
cp .env.example .env
nano .env  # Edit sesuai kebutuhan

# Build dan jalankan
docker-compose up -d --build

# Lihat logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option B: Manual Docker

```bash
# Build image
docker build -t bipol-tracker:latest .

# Run container
docker run -d \
  --name bipol-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -p 3333:3333/udp \
  --env-file .env \
  bipol-tracker:latest

# Lihat logs
docker logs -f bipol-app
```

### Docker Commands Cheatsheet

```bash
# Restart container
docker-compose restart

# Rebuild tanpa cache
docker-compose build --no-cache
docker-compose up -d

# Masuk ke container
docker exec -it bipol-app sh

# Hapus semua dan rebuild fresh
docker-compose down -v
docker-compose up -d --build

# Check resource usage
docker stats bipol-app
```

---

## 🚂 5. Railway Deployment

Railway adalah platform cloud yang mudah digunakan untuk deploy Node.js apps.

### Step 5.1: Persiapan

1. Buat akun di [Railway](https://railway.app)
2. Install Railway CLI (opsional):
   ```bash
   npm install -g @railway/cli
   ```

### Step 5.2: Deploy via Dashboard

1. Login ke Railway Dashboard
2. Klik **New Project** → **Deploy from GitHub repo**
3. Pilih repository `bipol`
4. Railway akan auto-detect sebagai Node.js project

### Step 5.3: Konfigurasi Environment Variables

Di Railway Dashboard:
1. Klik project Anda
2. Buka tab **Variables**
3. Tambahkan semua variables dari `.env.example`

### Step 5.4: Custom Start Command

Di settings, set:
- **Build Command:** `npm run build`
- **Start Command:** `npm start`

### Step 5.5: Expose UDP Port

> ⚠️ **Catatan:** Railway tidak mendukung UDP secara langsung. 
> Untuk GPS tracker, gunakan VPS terpisah atau HTTP endpoint sebagai alternatif.

Alternatif: Gunakan endpoint HTTP untuk tracker:
```http
POST /api/track
Content-Type: application/json

{
  "bus_id": "B1234ABC",
  "latitude": -6.372,
  "longitude": 106.824,
  "speed": 25,
  "gas_level": 150
}
```

---

## 🔀 6. Nginx Reverse Proxy

### Step 6.1: Install Nginx

```bash
sudo apt install -y nginx
```

### Step 6.2: Buat Konfigurasi

```bash
sudo nano /etc/nginx/sites-available/bipol
```

**Konfigurasi lengkap:**

```nginx
# Redirect HTTP ke HTTPS
server {
    listen 80;
    server_name bipoltracker.cloud www.bipoltracker.cloud;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name bipoltracker.cloud www.bipoltracker.cloud;

    # SSL certificates (akan diisi oleh Certbot)
    ssl_certificate /etc/letsencrypt/live/bipoltracker.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bipoltracker.cloud/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Proxy settings
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location /assets/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker - no cache
    location /sw.js {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
```

### Step 6.3: Enable Site

```bash
# Symlink ke sites-enabled
sudo ln -s /etc/nginx/sites-available/bipol /etc/nginx/sites-enabled/

# Test konfigurasi
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 🔒 7. SSL Certificate (Let's Encrypt)

### Step 7.1: Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Step 7.2: Dapatkan Certificate

```bash
sudo certbot --nginx -d bipoltracker.cloud -d www.bipoltracker.cloud
```

Ikuti prompt:
1. Masukkan email untuk notifikasi
2. Agree to terms
3. Pilih redirect HTTP ke HTTPS

### Step 7.3: Auto-Renewal

Certbot otomatis setup cron job. Verifikasi dengan:

```bash
sudo certbot renew --dry-run
```

### Step 7.4: Verify SSL

Cek di browser atau gunakan:
```bash
curl -I https://bipoltracker.cloud
```

---

## ⚡ 8. PM2 Process Manager

PM2 menjaga aplikasi tetap berjalan dan auto-restart jika crash.

### Step 8.1: Install PM2

```bash
sudo npm install -g pm2
```

### Step 8.2: Start Application

```bash
cd /var/www/bipol

# Start dengan PM2
pm2 start server.js --name "bipol-app"

# View logs
pm2 logs bipol-app

# Monitor
pm2 monit
```

### Step 8.3: Auto-Start on Boot

```bash
# Generate startup script
pm2 startup

# Ikuti instruksi yang muncul, contoh:
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Save process list
pm2 save
```

### Step 8.4: PM2 Ecosystem File (Opsional)

Buat file `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'bipol-app',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/bipol/error.log',
    out_file: '/var/log/bipol/out.log',
    time: true
  }]
};
```

Run dengan:
```bash
pm2 start ecosystem.config.js
```

### PM2 Commands Cheatsheet

```bash
# Status
pm2 status

# Restart
pm2 restart bipol-app

# Stop
pm2 stop bipol-app

# Delete
pm2 delete bipol-app

# Reload (zero-downtime)
pm2 reload bipol-app

# Logs
pm2 logs bipol-app --lines 100

# Clear logs
pm2 flush
```

---

## 📊 9. Monitoring & Health Checks

### Built-in Health Endpoints

```bash
# Basic health check
curl http://localhost:3000/api/health

# Database connection check
curl http://localhost:3000/api/health/ready
```

### Setup Uptime Monitoring

Gunakan layanan seperti:
- [UptimeRobot](https://uptimerobot.com) (gratis)
- [Better Uptime](https://betteruptime.com)
- [Pingdom](https://www.pingdom.com)

Setup monitoring untuk:
- `https://bipoltracker.cloud/api/health`
- Interval: 5 menit
- Alert via Email/Telegram/Slack

### Log Rotation

```bash
# Install logrotate (biasanya sudah ada)
sudo apt install -y logrotate

# Buat config untuk PM2 logs
sudo nano /etc/logrotate.d/pm2
```

```
/var/log/bipol/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
```

### Server Monitoring

```bash
# Install htop
sudo apt install -y htop

# Monitor realtime
htop

# Disk usage
df -h

# Memory
free -m
```

---

## 🔧 Troubleshooting

### Application tidak start

```bash
# Cek logs PM2
pm2 logs bipol-app --lines 50

# Cek port yang digunakan
sudo lsof -i :3000

# Kill process di port
sudo kill -9 $(sudo lsof -t -i:3000)
```

### Database connection error

```bash
# Test koneksi ke Supabase
curl -H "apikey: YOUR_SUPABASE_KEY" \
     https://YOUR_PROJECT.supabase.co/rest/v1/health
```

### WebSocket tidak connect

1. Pastikan Nginx sudah dikonfigurasi untuk WebSocket
2. Cek CORS settings di `.env`
3. Pastikan tidak ada firewall blocking

### UDP tidak terima data

```bash
# Test UDP port
sudo netstat -ulnp | grep 3333

# Test kirim data
echo "TEST,-6.372,106.824,30,100" | nc -u localhost 3333

# Cek firewall
sudo ufw status
```

### SSL Certificate issues

```bash
# Renew manual
sudo certbot renew --force-renewal

# Check certificate
sudo certbot certificates
```

### High memory usage

```bash
# Restart PM2 apps
pm2 restart all

# Clear PM2 logs
pm2 flush

# Check memory per process
pm2 monit
```

---

## 📝 Deployment Checklist

Sebelum go-live, pastikan:

- [ ] Database schema sudah di-setup
- [ ] Environment variables sudah dikonfigurasi
- [ ] Password default sudah diganti
- [ ] SSL certificate sudah aktif
- [ ] Firewall sudah dikonfigurasi
- [ ] PM2/Docker sudah running
- [ ] Health check endpoint berfungsi
- [ ] GPS tracker bisa mengirim data
- [ ] WebSocket connection bekerja
- [ ] Admin login berfungsi
- [ ] Monitoring sudah di-setup

---

## 🆘 Need Help?

- 📖 [README.md](README.md) - Dokumentasi lengkap
- 🐛 [GitHub Issues](https://github.com/ifauzeee/BIPOL/issues) - Report bugs
- 💬 [Discussions](https://github.com/ifauzeee/BIPOL/discussions) - Tanya jawab

---

<div align="center">

Happy Deploying! 🚀

</div>
