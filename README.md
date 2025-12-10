# 🚌 Bipol Tracker (IoT Bus Tracking System)

**Bipol Tracker** adalah sistem pelacakan armada bus real-time berbasis IoT. Sistem ini memantau lokasi (GPS), kecepatan, dan kadar gas/asap kendaraan menggunakan ESP32, kemudian menampilkannya dalam peta interaktif di website.

## 🌟 Fitur Utama
* **Real-time Tracking:** Pembaruan lokasi bus setiap 3 detik.
* **Gas Monitoring:** Deteksi dini kebocoran gas atau asap berlebih pada armada.
* **Estimasi Waktu (ETA):** Menghitung prediksi waktu tiba ke halte terdekat.
* **Map Visualization:** Peta interaktif menggunakan MapLibre GL JS & OpenStreetMap.
* **Responsive UI:** Tampilan yang optimal untuk Desktop dan Mobile.

---

## 📂 Struktur Proyek

```text
/bipol-tracker
├── firmware/             # Kode program untuk Hardware (ESP32)
│   └── esp32_tracker.ino
├── public/               # Frontend Website (Static Files)
│   ├── css/              # Stylesheet
│   ├── js/               # Logika Website (Map, UI, Data Fetching)
│   ├── images/           # Aset gambar/icon
│   └── index.html        # Halaman Utama
├── node_modules/         # Dependencies Node.js
├── .env                  # Konfigurasi Environment (Rahasia)
├── server.js             # Backend Server (Express.js)
├── supabase-schema.sql   # Skema Database PostgreSQL
└── README.md             # Dokumentasi Proyek
````

-----

## 🛠️ Instalasi & Setup Server

### 1\. Persiapan Database (Supabase)

1.  Buat project baru di [Supabase](https://supabase.com).
2.  Buka SQL Editor di dashboard Supabase.
3.  Copy isi file `supabase-schema.sql` dan jalankan (Run) untuk membuat tabel.

### 2\. Setup Backend (VPS/Local)

Pastikan **Node.js v18+** sudah terinstall.

```bash
# Clone repository
git clone https://github.com/ifauzeee/bipol.git

# Install dependencies
npm install

# Setup Environment Variables
cp .env.example .env
nano .env
```

Isi file `.env` dengan kredensial Anda:

```env
PORT=3000
SUPABASE_URL=[https://project-id.supabase.co](https://project-id.supabase.co)
SUPABASE_KEY=your-anon-key
```

### 3\. Menjalankan Server

Gunakan **PM2** agar server tetap berjalan di background.

```bash
# Start server
pm2 start server.js --name bipol-tracker

# Simpan state agar auto-start saat reboot
pm2 save
pm2 startup
```

-----

## 📡 Setup Hardware (ESP32)

1.  Buka file `firmware/esp32_tracker.ino` menggunakan **Arduino IDE**.
2.  Install library yang dibutuhkan:
      * `TinyGPS++`
      * `HTTPClient` (Bawaan ESP32)
      * `WiFi` (Bawaan ESP32)
3.  Edit bagian konfigurasi di bagian atas kode:
    ```cpp
    const char* ssid = "NAMA_WIFI";
    const char* password = "PASSWORD_WIFI";
    const char* serverUrl = "http://IP_SERVER_ANDA:3000/api/track";
    ```
4.  Wiring Diagram (Standar):
      * **GPS NEO-6M:** VCC(3.3V), GND(GND), RX(GPIO 17), TX(GPIO 16)
      * **Gas Sensor (MQ-2):** A0 ke GPIO 34.

-----

## 🔍 Cara Monitoring & Debugging

Panduan ini berguna untuk memastikan sistem berjalan dengan baik dari Terminal Server maupun Browser.

### 1\. Cek Apakah Data Masuk ke Server (Via Terminal)

Gunakan perintah ini untuk melihat log langsung dari backend. Anda akan melihat log `[DATA MASUK]` jika ESP32 berhasil mengirim data.

```bash
pm2 logs bipol-tracker
```

  * **Sukses:** Muncul JSON berisi `{ bus_id: 'BUS-01', latitude: ..., longitude: ... }`.
  * **Gagal:** Tidak ada log baru, cek koneksi internet ESP32.

### 2\. Cek Apakah API Mengeluarkan Data (Via Terminal)

Gunakan `curl` untuk memastikan Backend berhasil mengambil data dari Database dan menyajikannya dalam format JSON.

```bash
curl http://localhost:3000/api/bus/location
```

  * **Output Benar:** `{"data":[{"bus_id":"BUS-01","latitude":-6.37...}]}`
  * **Output Error:** `Internal Server Error` atau `{}` (objek kosong).

### 3\. Cek Tampilan di Website (Via Browser)

Buka alamat IP atau Domain server Anda:
`http://IP_SERVER:3000`

  * Jika status **"Mencari sinyal satelit..."**: Refresh halaman (Hard Reload `Ctrl+F5`). Jika masih sama, berarti data di database kosong atau API error.
  * Jika peta muncul tapi **Bus tidak bergerak**: Cek kembali log server (Langkah 1).

### 4\. Restart Server

Jika melakukan perubahan kode di `server.js`, server wajib direstart:

```bash
pm2 restart bipol-tracker
```

-----

## 📝 API Endpoints

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/api/track` | Menerima data JSON dari ESP32. |
| `GET` | `/api/bus/location` | Mengirim data lokasi terbaru ke Frontend. |
| `GET` | `/` | Menyajikan halaman web utama. |

-----

**Developed by Bipol Team**