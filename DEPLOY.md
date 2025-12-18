# Panduan Deployment BIPOL ke VPS

Panduan ini akan membantu Anda men-deploy sistem backend BIPOL ke VPS (Virtual Private Server) dan mengkonfigurasi perangkat keras ESP32.

## Prasyarat
- VPS dengan OS Ubuntu 20.04/22.04 LTS.
- Akses SSH ke VPS.
- Domain (opsional, tapi disarankan untuk HTTPS).

---

## Bagian 1: Setup VPS & Backend

### 1. Masuk ke VPS
SSH ke VPS Anda:
```bash
ssh root@ip-vps-anda
```

### 2. Clone Repository
Clone repository ini ke VPS:
```bash
git clone https://github.com/ifauzeee/BIPOL.git
cd BIPOL
```
*(Ganti URL git jika berbeda)*

### 3. Jalankan Script Setup
Script ini akan menginstall Docker, Docker Compose, dan mengkonfigurasi Firewall.
```bash
chmod +x deploy/setup.sh
./deploy/setup.sh
```

### 4. Konfigurasi Environment (.env)
Copy file contoh dan edit sesuai kebutuhan:
```bash
cp .env.example .env
nano .env
```
**Penting:**
- Isi `SUPABASE_URL` dan `SUPABASE_KEY` dari dashboard Supabase Anda.
- Ganti `SESSION_SECRET` dengan string acak yang panjang.
- Jika menggunakan HTTPS, set `USE_HTTPS=true`.

### 5. Jalankan Aplikasi
Jalankan aplikasi menggunakan Docker Compose:
```bash
docker compose up -d --build
```
Cek apakah container berjalan:
```bash
docker compose ps
```
Cek logs:
```bash
docker compose logs -f
```

### 6. Setup Domain & HTTPS (Opsional - Disarankan)
Jika Anda memiliki domain, gunakan Nginx sebagai reverse proxy.

1. Copy config nginx:
   ```bash
   cp deploy/nginx.conf /etc/nginx/sites-available/bipol
   ```
2. Edit file config dan ganti `your-domain.com` dengan domain Anda:
   ```bash
   nano /etc/nginx/sites-available/bipol
   ```
3. Aktifkan site:
   ```bash
   ln -s /etc/nginx/sites-available/bipol /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```
4. Setup HTTPS dengan Certbot:
   ```bash
   certbot --nginx -d your-domain.com
   ```

---

## Bagian 2: Setup Hardware (ESP32)

Agar perangkat pelacak bisa mengirim data ke VPS baru Anda, Anda perlu mengupdate firmware.

1. Buka folder `firmware`.
2. Buat file `arduino_secrets.h` dari contoh:
   - Jika di lokal komputer Anda, copy isi `arduino_secrets.h.example` ke `arduino_secrets.h`.
3. Edit `arduino_secrets.h`:
   ```cpp
   #define SECRET_SERVER_IP "IP_VPS_ANDA" // Masukkan IP VPS di sini
   #define SECRET_UDP_PORT 3333
   ```
4. Upload sketch `esp32_tracker_udp.ino` ke ESP32 Anda.

---

## Troubleshooting

- **Server tidak bisa diakses?**
  - Pastikan port 80/443 (HTTP) dan 3333 (UDP) dibuka di firewall penyedia VPS (AWS Security Group / DigitalOcean Firewall).
  - Cek status container: `docker compose ps`

- **Data GPS tidak masuk?**
  - Pastikan `SECRET_SERVER_IP` di ESP32 sudah benar.
  - Cek logs server untuk melihat data masuk: `docker compose logs -f | grep UDP`
  - Pastikan kartu SIM memiliki kuota dan APN benar.

- **Supabase Error?**
  - Pastikan URL dan Key di `.env` sudah benar.
