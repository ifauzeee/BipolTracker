# 🌍 PANDUAN DEPLOYMENT BIPOL TRACKER

Dokumen ini menjelaskan secara rinci bagaimana cara men-deploy aplikasi **Bipol Tracker** ke lingkungan *production* atau *development* anda. Panduan ini mencakup konfigurasi environment, setup database, dan eksekusi server.

---

## 📋 Daftar Isi
1.  [Persyaratan Sistem](#1-persyaratan-sistem)
2.  [Konfigurasi Environment (.env)](#2-konfigurasi-environment-env)
3.  [Persiapan Database (Supabase)](#3-persiapan-database-supabase)
4.  [Metode Deployment](#4-metode-deployment)
    *   [Opsi A: Menggunakan Docker (Direkomendasikan)](#opsi-a-menggunakan-docker-direkomendasikan)
    *   [Opsi B: Manual (Node.js)](#opsi-b-manual-nodejs)
5.  [Verifikasi Instalasi](#5-verifikasi-instalasi)
6.  [Troubleshooting](#6-troubleshooting)

---

## 1. Persyaratan Sistem
Sebelum memulai, pastikan server atau komputer Anda memiliki spesifikasi berikut:
*   **OS**: Linux / macOS / Windows
*   **RAM**: Minimal 1GB (Disarankan 2GB+)
*   **Software**:
    *   [Docker Engine](https://docs.docker.com/engine/install/) & Docker Compose (Untuk Opsi A)
    *   [Node.js v18+](https://nodejs.org/) (Untuk Opsi B)
    *   Git

---

## 2. Konfigurasi Environment (.env)
File `.env` adalah jantung konfigurasi aplikasi ini. Jangan pernah meng-upload file `.env` asli ke repository publik.

1.  Duplikat file contoh:
    ```bash
    cp .env.example .env
    ```

2.  Edit file `.env` menggunakan text editor (nano/vim/vscode) dan isi variabel berikut:

| Variabel | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- |
| **PORT** | Port untuk Web Server / API | `3000` |
| **UDP_PORT** | Port untuk menerima data GPS | `3333` |
| **NODE_ENV** | Mode aplikasi | `production` |
| **SUPABASE_URL** | URL Project Supabase Anda | `https://xyz.supabase.co` |
| **SUPABASE_KEY** | Service Role Key (Server-side) | `eyJhbGcis...` |
| **SESSION_SECRET** | Kunci enkripsi session cookie | `rahasia_super_panjang_123` |
| **ALLOWED_ORIGINS** | Domain yang diizinkan (CORS) | `https://domainanda.com` |
| **DATA_RETENTION_HOURS**| Lama data GPS disimpan (jam) | `24` |

> **⚠️ Security Tip**: Gunakan `Service Role Key` dari Supabase untuk akses database tanpa batasan RLS di sisi server. Pastikan key ini tidak bocor ke client-side.

---

## 3. Persiapan Database (Supabase)
Aplikasi ini membutuhkan struktur tabel tertentu agar berfungsi.

1.  Login ke Dashboard [Supabase](https://supabase.com/).
2.  Buka project Anda -> Menu **SQL Editor**.
3.  Buka file lokal `database/setup_full.sql` dari repository ini.
4.  Copy semua isi file tersebut dan Paste ke SQL Editor Supabase.
5.  Klik tombol **Run** untuk membuat tabel dan relasi yang diperlukan.

Struktur utama yang akan dibuat meliputi:
*   `users`: Menyimpan data admin/driver.
*   `bipol_tracker`: Log data history perjalanan.
*   `devices`: Daftar perangkat GPS yang terdaftar.

---

## 4. Metode Deployment

### Opsi A: Menggunakan Docker (Direkomendasikan)
Metode ini paling stabil karena memastikan isolasi environment.

1.  **Build dan Jalankan Container**:
    Pastikan Anda berada di direktori root project.
    ```bash
    docker compose up -d --build
    ```
    *Flag `-d` menjalankan container di background.*

2.  **Cek Log (Opsional)**:
    Untuk memastikan aplikasi berjalan lancar:
    ```bash
    docker compose logs -f
    ```

3.  **Update Aplikasi**:
    Jika ada perubahan kode, jalankan perintah langkah 1 lagi. Docker akan otomatis me-rebuild image.

### Opsi B: Manual (Node.js)
Gunakan metode ini jika Anda tidak ingin menggunakan Docker atau membutuhkan kontrol manual penuh.

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Build Frontend (Jika ada aset Vite)**:
    ```bash
    npm run build
    ```

3.  **Jalankan Server**:
    *   **Mode Development**:
        ```bash
        npm start
        ```
    *   **Mode Production** (Gunakan PM2 agar auto-restart):
        ```bash
        npm install -g pm2
        pm2 start server.js --name "bipol-backend"
        ```

---

## 5. Verifikasi Instalasi

Setelah aplikasi berjalan, lakukan pengecekan berikut:

1.  **Web Interface**:
    Buka `http://localhost:3000` (atau IP server Anda). Pastikan halaman login muncul.
2.  **API Health Check**:
    Akses `http://localhost:3000/api/health`. Response harus JSON:
    ```json
    { "status": "healthy", ... }
    ```
3.  **Database Connection**:
    Akses `http://localhost:3000/api/health/ready` untuk memastikan koneksi ke Supabase berhasil.
    ```json
    { "status": "ready", "database": "connected" }
    ```

---

## 6. Troubleshooting

### 🔴 Port Conflict
*   **Error**: `EADDRINUSE: address already in use :::3000`
*   **Solusi**: Port 3000 sudah dipakai aplikasi lain. Ubah `PORT` di file `.env` ke angka lain (misal `3001`), lalu restart.

### 🔴 Koneksi UDP Gagal
*   **Masalah**: GPS Tracker tidak mengirim data.
*   **Solusi**: Pastikan Firewall / Security Group di server (AWS/GCP/VPS) telah membuka **Port 3333 (UDP)**. Ingat, protokolnya UDP, bukan TCP.

### 🔴 Supabase Connection Error
*   **Error**: `PGRST301` atau Authorization error.
*   **Solusi**: Cek kembali `SUPABASE_URL` dan `SUPABASE_KEY` di `.env`. Pastikan tidak ada spasi berlebih saat copy-paste.

---

*Dokumen ini diperbarui terakhir pada: Desember 2025*
