# 🚌 Bipol Tracker (Bus Tracking System)

![Bipol Tracker Banner](/frontend/public/images/header.png)

**Bipol Tracker** adalah sistem pelacakan bus *real-time* berbasis web yang dirancang khusus untuk mobilitas kampus. Aplikasi ini memungkinkan pengguna memantau posisi bus, estimasi kedatangan, dan kondisi armada secara langsung dari *smartphone*.

Dibangun dengan teknologi **Progressive Web App (PWA)** modern, aplikasi ini menawarkan pengalaman seperti aplikasi native tanpa perlu instalasi via App Store, lengkap dengan dukungan offline dan performa tinggi.

---

## ✨ Fitur Unggulan

### 📱 **Pengalaman Pengguna (User Experience)**
- **Real-time Tracking**: Memantau posisi bus bergerak di peta secara LIVE tanpa *refresh* halaman (menggunakan Socket.IO).
- **High-Definition Map**: Tampilan peta tajam (Retina Display support) yang dioptimalkan untuk layar HP modern.
- **Auto-Zoom & Lock**: Fokus otomatis ke bus yang dipilih dengan batas zoom yang nyaman agar navigasi tidak *bablas*.
- **PWA Installable**: Dapat diinstal ke *Homescreen* HP selayaknya aplikasi native (Android & iOS).
- **Offline Mode**: Tetap dapat dibuka meski koneksi internet terputus (data terakhir tersimpan di cache).

### 🛠 **Fitur Teknis & Administratif**
- **Sistem Cache Busting Otomatis**: Update tampilan (HTML/CSS/JS) langsung terkirim ke user tanpa perlu hapus cache manual (ditenagai oleh **Vite Build System**).
- **Admin Dashboard**: Panel kontrol lengkap untuk memantau status armada, log perjalanan, geofencing, dan manajemen laporan pengguna.
- **Pelaporan Insiden**: Fitur "Lost & Found" dan "Feedback" terintegrasi untuk komunikasi dua arah antara penumpang dan operator.
- **Smart Alerts**: Notifikasi otomatis jika ada anomali pada armada (misal: sensor gas tinggi atau berhenti terlalu lama).

---

## 🏗 Teknologi yang Digunakan

Project ini dibangun di atas stack teknologi modern yang efisien dan *scalable*:

| Komponen | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Frontend** | HTML5, Vanilla JS, CSS3 | Ringan dan cepat tanpa framework berat. |
| **Build Tool** | **Vite** | Bundle assets & hashing otomatis untuk cache management. |
| **PWA Engine** | **Workbox** | Manajemen Service Worker untuk offline & caching canggih. |
| **Peta** | MapLibre GL JS | Rendering peta vektor interaktif & 3D buildings. |
| **Backend** | Node.js + Express | API Server dan static file serving. |
| **Real-time** | Socket.IO | Komunikasi data dua arah server-client (low latency). |
| **Database** | (Internal Memory/Log) | Penyimpanan sementara untuk sesi live tracking. |
| **Deployment** | **Docker** | Containerization untuk kemudahan deployment di server manapun. |

---

## 🚀 Panduan Instalasi & Deployment

Berikut adalah langkah-langkah untuk menjalankan aplikasi ini baik di server produksi maupun lokal.

### Prasyarat
Pastikan komputer/server Anda sudah terinstal:
- **Docker** & **Docker Compose** (Sangat Disarankan)
- *Atau* Node.js v18+ (Jika ingin run manual)

### Cara 1: Menjalankan dengan Docker (Rekomendasi)
Metode ini paling stabil dan otomatis. Semua proses build dan setup sudah ditangani oleh Docker.

1.  **Jalankan Container:**
    ```bash
    docker compose up --build -d
    ```
    *Perintah ini akan secara otomatis:*
    - *Menginstall dependency.*
    - *Melakukan build frontend via Vite (hashing file asset).*
    - *Menjalankan server di port 3000.*

2.  **Akses Aplikasi:**
    Buka browser dan kunjungi `http://localhost:3000`

### Cara 2: Menjalankan Secara Manual (Development)
Gunakan cara ini jika Anda sedang mengembangkan fitur dan butuh akses cepat ke file.

1.  **Install Dependency:**
    ```bash
    npm install
    ```

2.  **Build Frontend:**
    Penting! Anda harus mem-build frontend agar asset masuk ke folder `public/`.
    ```bash
    npm run build
    ```

3.  **Jalankan Server:**
    ```bash
    npm start
    ```

---

## 🔄 Workflow Update (Cara Mengupdate Web)

Aplikasi ini menggunakan sistem **Vite** untuk memastikan setiap update kode langsung diterima user tanpa masalah *caching*.

Setiap kali Anda selesai mengedit kode (HTML, CSS, atau Javascript di folder `frontend/`), lakukan langkah berikut:

### Jika menggunakan Docker:
Cukup jalankan ulang container dengan flag `--build`:
```bash
docker compose up --build -d
```
Docker akan otomatis melakukan *re-compile* asset dan server akan restart dengan versi terbaru.

### Jika manual (tanpa Docker):
Anda wajib menjalankan build script sebelum restart server:
```bash
npx vite build
node server.js
```

---

## 📂 Struktur Project

Agar mudah dipahami, berikut adalah struktur folder utama aplikasi ini:

```
bipol/
├── browser_recordings/   # (Artifacts) Rekaman sesi browser agen
├── frontend/             # SOURCE CODE UTAMA (Edit di sini!)
│   ├── public/           # Asset mentah (gambar, manifest, icon)
│   ├── src/              # Kode sumber JS dan CSS
│   │   ├── css/          # File style (style.css, admin.css)
│   │   └── js/           # Logika aplikasi (app.js, map.js, ui.js)
│   ├── index.html        # Halaman utama
│   ├── admin.html        # Halaman admin
│   ├── login.html        # Halaman login
│   ├── sw.js             # Konfigurasi Service Worker (PWA)
│   └── vite.config.js    # Konfigurasi build system
├── public/               # HASIL BUILD (JANGAN EDIT DI SINI!)
│   ├── assets/           # File CSS/JS yang sudah di-hash (cth: index.a1b2.js)
│   └── ...               # File statis siap saji
├── server.js             # Kode Backend / Server Express
├── Dockerfile            # Konfigurasi Image Docker
├── docker-compose.yml    # Konfigurasi Container Orchestration
└── package.json          # Dependency project
```

> **⚠️ PENTING:**
> Selalu edit file yang ada di dalam folder **`frontend/`**.
> Folder `public/` di root direktori utama adalah folder **OUTPUT** hasil build. Perubahan yang Anda lakukan langsung di folder `public/` akan **tertimpa/hilang** saat Anda menjalankan `npm run build`.

---

## 🛡️ Akun Default

Halaman **Admin Panel** dapat diakses melalui `/admin` atau ikon user di pojok kanan bawah peta.

- **Login Page**: `/login`
- **Username Default**: `bipol` *(atau sesuai database/env)*
- **Password Default**: *(Hubungi administrator sistem)*

---

## 🤝 Kontribusi & Feedback

Project ini dikembangkan oleh **Tim Pejuang Bipol**.
Kami sangat terbuka terhadap masukan. Jika menemukan *bug* atau memiliki ide fitur baru:
1.  Gunakan fitur **Feedback** di dalam aplikasi (Menu FAQ > Lapor Bug).
2.  Atau hubungi tim pengembang secara langsung.

---

*Terakhir Diperbarui: Desember 2025*
*Created with ❤️ by Bipol Dev Team*
