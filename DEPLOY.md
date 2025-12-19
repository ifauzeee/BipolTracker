# Panduan Deployment Bipol Tracker

Dokumen ini menjelaskan langkah-langkah lengkap untuk menginstal dan men-deploy aplikasi Bipol Tracker ke server (VPS/Ubuntu) atau menjalankannya secara lokal.

## 1. Persiapan Sistem

Pastikan server atau mesin lokal Anda memiliki:
- **Node.js** (Versi 18 atau terbaru direkomendasikan)
- **NPM** (Biasanya terinstall bersama Node.js)
- **Git**
- **Supabase Account** (Untuk database PostgreSQL)

## 2. Instalasi Project

Clone repository dan install dependencies:

```bash
git clone <repository_url>
cd bipol
npm install
```

## 3. Konfigurasi Database (Supabase)

1. Buat project baru di [Supabase Dashboard](https://supabase.com).
2. Masuk ke **SQL Editor** di dashboard Supabase.
3. Buka file `database/setup_full.sql` yang ada di project ini.
4. Copy seluruh isi file tersebut dan Paste ke SQL Editor Supabase.
5. Klik **Run** untuk membuat semua tabel dan konfigurasi awal.

## 4. Konfigurasi Environment Variable

Duplikat file contoh `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Edit file `.env` dan isi sesuai konfigurasi Anda:

```bash
nano .env
```

Pastikan Anda mengisi:
- `SUPABASE_URL` dan `SUPABASE_KEY` (Didapat dari Supabase > Project Settings > API).
- `SESSION_SECRET` (Isi dengan string acak yang panjang untuk keamanan session).
- `ALLOWED_ORIGINS` (URL web Anda, pisahkan dengan koma jika lebih dari satu).

## 5. Menjalankan Server

### Mode Development (Lokal)
Untuk menjalankan server dan build frontend secara bersamaan dengan hot-reload:

```bash
npm run dev
```
Akses di `http://localhost:3000`.

### Mode Production (Server/VPS)

1. **Build Frontend:**
   ```bash
   npm run build
   ```
   Ini akan meng-compile file frontend ke folder `public/`.

2. **Jalankan Server:**
   ```bash
   npm start
   ```

## 6. Deployment di VPS (Menggunakan PM2 & Nginx)

Untuk deployment yang stabil di server (misal Ubuntu di AWS/DigitalOcean), gunakan **PM2** untuk memanajemen proses dan **Nginx** sebagai reverse proxy.

### Install PM2
```bash
npm install -g pm2
```

### Jalankan Aplikasi dengan PM2
```bash
pm2 start server.js --name "bipol-tracker"
pm2 save
pm2 startup
```

### Konfigurasi Nginx (Reverse Proxy)
Install Nginx:
```bash
sudo apt update
sudo apt install nginx
```

Buat config server block:
```bash
sudo nano /etc/nginx/sites-available/bipol
```

Isi dengan konfigurasi berikut (sesuaikan `domain_anda.com`):

```nginx
server {
    server_name domain_anda.com www.domain_anda.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan config:
```bash
sudo ln -s /etc/nginx/sites-available/bipol /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL (HTTPS) dengan Certbot
Amankan domain Anda dengan SSL gratis dari Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d domain_anda.com -d www.domain_anda.com
```

## 7. Troubleshooting

- **Server Error:** Cek logs dengan `pm2 logs bipol-tracker`.
- **Database Error:** Pastikan `SUPABASE_URL` dan `KEY` benar dan table sudah dibuat via SQL script.
- **WebSocket Gagal:** Pastikan konfigurasi Nginx sudah support Upgrade header (seperti contoh di atas).
