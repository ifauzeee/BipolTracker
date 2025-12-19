![Bipol Tracker Banner](/frontend/public/images/header.png)

# 📡 BIPOL TRACKER
> **Advanced Real-Time Asset Tracking & Monitoring System**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.0-black.svg?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-emerald.svg?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-black.svg?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 📖 Ringkasan Project
**Bipol Tracker** adalah platform pelacakan GPS *real-time* yang dirancang untuk stabilitas tinggi dan kemudahan penggunaan. Sistem ini menghubungkan perangkat keras GPS (melalui protokol UDP kustom) dengan dashboard web interaktif, memungkinkan pemantauan armada atau aset secara langsung dengan latensi minimal.

Dibangun dengan arsitektur modern menggunakan **Node.js** dan **Supabase**, Bipol Tracker menawarkan solusi *end-to-end* mulai dari penerimaan data sensor mentah hingga visualisasi peta yang intuitif.

### 🌟 Fitur Utama
*   **📍 Real-Time Tracking**: Pemantauan lokasi presisi dengan pembaruan instan via Socket.io.
*   **🛠️ Custom UDP Protocol**: Server UDP terdedikasi (Port 3333) untuk efisiensi data dari perangkat IoT.
*   **👮 Admin Dashboard**: Kontrol penuh untuk manajemen user, armada, dan laporan history.
*   **🚙 Driver Interface**: Dashboard khusus pengemudi untuk status koneksi dan informasi tugas.
*   **🚧 Geofencing System**: (Beta) Notifikasi otomatis saat aset keluar/masuk area tertentu.
*   **🛡️ Enterprise Security**: Rate limiters, Helmet headers, XSS cleaning, dan HPP protection.
*   **🧹 Smart Maintenance**: Pembersihan data otomatis untuk menjaga performa database tetap optimal.
*   **📱 PWA Ready**: Dukungan Progressive Web App untuk pengalaman native di mobile.

---

## 🏗️ Tech Stack

| Komponen | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Backend** | Node.js + Express | REST API & WebSocket Server |
| **Database** | Supabase (PostgreSQL) | Penyimpanan data relasional & real-time |
| **Real-time** | Socket.io | Komunikasi dua arah server-client |
| **Protocol** | UDP (Dgram) | Komunikasi hemat data untuk GPS Tracker |
| **Frontend** | HTML5 / Vite | Antarmuka pengguna responsif |
| **Infrastructure** | Docker | Containerization untuk deployment mudah |

---

## 📂 Struktur Project

```bash
bipol/
├── config/           # Konfigurasi database & environment
├── controllers/      # Logika bisnis (Auth, Admin, Tracker)
├── database/         # Skema SQL untuk setup Supabase
├── firmware/         # Kode firmware untuk perangkat IoT
├── frontend/         # Source code UI (Assets, HTML)
├── public/           # Static files served by Express
├── routes/           # Definisi endpoint API
├── services/         # Service layer (UDP, Geofence, Cleanup)
└── server.js         # Entry point aplikasi
```

---

## 🚀 Langkah Instalasi Cepat

Untuk panduan deployment lengkap ke server production, silakan baca **[DEPLOY.md](DEPLOY.md)**.

### Prasyarat
*   [Node.js](https://nodejs.org/) (v18 atau terbaru)
*   [Docker Desktop](https://www.docker.com/) (Opsional, direkomendasikan)
*   Akun [Supabase](https://supabase.com/)

### 1️⃣ Clone Repository
```bash
git clone https://github.com/ifauzeee/BIPOL.git
cd bipol
```

### 2️⃣ Konfigurasi Environment
Salin file `.env.example` dan sesuaikan dengan kredensial Anda.
```bash
cp .env.example .env
```
> **Penting**: Pastikan `SUPABASE_URL` dan `SUPABASE_KEY` telah diisi dengan benar.

### 3️⃣ Jalankan Aplikasi (Docker)
Cara termudah untuk menjalankan Bipol Tracker adalah menggunakan Docker Compose.
```bash
docker compose up -d --build
```
Akses aplikasi di: `http://localhost:3000`

### 4️⃣ Setup Database
Eksekusi query SQL yang ada di `database/setup_full.sql` pada SQL Editor Supabase Anda untuk membuat tabel yang dibutuhkan.

---

## 🤝 Kontribusi
Kontribusi sangat terbuka! Silakan fork repository ini dan buat Pull Request untuk fitur baru atau perbaikan bug.

## 📄 Lisensi
Project ini dilisensikan di bawah [MIT License](LICENSE).

---
<p align="center">Made with ❤️ by Bipol Team</p>
